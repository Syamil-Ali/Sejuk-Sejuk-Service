from __future__ import annotations

import time
from typing import Annotated, cast
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile, status

from sejuk_assistant.api.dependencies import authenticated_actor
from sejuk_assistant.audit import AuditWriter
from sejuk_assistant.auth.context import ActorContext
from sejuk_assistant.documents.extraction import (
    PAYMENT_INSTRUCTIONS,
    DocumentExtraction,
    DocumentExtractor,
    ExtractedPaymentFields,
    ExtractionResponse,
    assert_extraction_access,
    assert_payment_extraction_access,
    order_fields_from_model,
    payment_fields_from_model,
)
from sejuk_assistant.documents.intake import (
    DocumentIntakeError,
    DocumentManifest,
    SupabaseDocumentIntakeStore,
    prepare_document,
)
from sejuk_assistant.documents.storage import (
    DocumentStorageError,
    fetch_document_metadata,
    read_document_file,
)
from sejuk_assistant.repositories.supabase import CallerSupabaseRepository, RepositoryError

router = APIRouter(prefix="/v1/documents", tags=["documents"])


@router.post("/ingest", response_model=DocumentManifest, status_code=status.HTTP_202_ACCEPTED)
async def ingest_document(
    request: Request,
    title: Annotated[str, Form(min_length=1, max_length=200)],
    file: Annotated[UploadFile, File()],
    actor: Annotated[ActorContext, Depends(authenticated_actor)],
) -> DocumentManifest:
    store = request.app.state.document_intake_store
    if store is None:
        try:
            store = SupabaseDocumentIntakeStore(request.app.state.settings)
        except RuntimeError as error:
            raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, str(error)) from error
    try:
        return await prepare_document(actor, file, title, store)
    except PermissionError as error:
        raise HTTPException(status.HTTP_403_FORBIDDEN, str(error)) from error
    except DocumentIntakeError as error:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, str(error)) from error


@router.post(
    "/{document_id}/extract",
    response_model=ExtractionResponse,
    status_code=status.HTTP_200_OK,
)
async def extract_document(
    document_id: UUID,
    request: Request,
    actor: Annotated[ActorContext, Depends(authenticated_actor)],
) -> ExtractionResponse:
    try:
        assert_extraction_access(actor)
    except PermissionError as error:
        raise HTTPException(status.HTTP_403_FORBIDDEN, str(error)) from error
    token = request.headers.get("authorization", "").removeprefix("Bearer ").strip()
    repository = CallerSupabaseRepository(request.app.state.settings, token, actor)
    started = time.monotonic()
    try:
        metadata = await fetch_document_metadata(request.app.state.settings, document_id)
        content = await read_document_file(request.app.state.settings, metadata["storage_path"])
        extractor = request.app.state.document_extractor
        if extractor is None:
            extractor = DocumentExtractor(request.app.state.settings)
            request.app.state.document_extractor = extractor
        parsed = await extractor.extract(content, metadata["mime_type"])
        extraction = order_fields_from_model(parsed)
        await _save_extraction(
            repository, actor, document_id, "extract_document_fields", extraction, started
        )
        return ExtractionResponse(
            document_id=document_id,
            fields=extraction.fields,
            confidence=extraction.confidence,
        )
    except DocumentStorageError as error:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(error)) from error
    except RepositoryError as error:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE, "Document extraction could not be saved."
        ) from error
    except (RuntimeError, ValueError) as error:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, str(error)) from error
    finally:
        await repository.close()


@router.post(
    "/{document_id}/extract-payment",
    response_model=ExtractionResponse,
    status_code=status.HTTP_200_OK,
)
async def extract_payment_receipt(
    document_id: UUID,
    request: Request,
    actor: Annotated[ActorContext, Depends(authenticated_actor)],
) -> ExtractionResponse:
    try:
        assert_payment_extraction_access(actor)
    except PermissionError as error:
        raise HTTPException(status.HTTP_403_FORBIDDEN, str(error)) from error
    token = request.headers.get("authorization", "").removeprefix("Bearer ").strip()
    repository = CallerSupabaseRepository(request.app.state.settings, token, actor)
    started = time.monotonic()
    try:
        metadata = await fetch_document_metadata(request.app.state.settings, document_id)
        content = await read_document_file(request.app.state.settings, metadata["storage_path"])
        extractor = DocumentExtractor(
            request.app.state.settings,
            output_schema=ExtractedPaymentFields,
            instructions=PAYMENT_INSTRUCTIONS,
        )
        parsed = await extractor.extract(content, metadata["mime_type"])
        extraction = payment_fields_from_model(cast(ExtractedPaymentFields, parsed))
        await _save_extraction(
            repository, actor, document_id, "extract_payment_receipt", extraction, started
        )
        return ExtractionResponse(
            document_id=document_id,
            fields=extraction.fields,
            confidence=extraction.confidence,
        )
    except DocumentStorageError as error:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(error)) from error
    except RepositoryError as error:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE, "Receipt extraction could not be saved."
        ) from error
    except (RuntimeError, ValueError) as error:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, str(error)) from error
    finally:
        await repository.close()


async def _save_extraction(
    repository: CallerSupabaseRepository,
    actor: ActorContext,
    document_id: UUID,
    tool_name: str,
    extraction: DocumentExtraction,
    started: float,
) -> None:
    latency_ms = int((time.monotonic() - started) * 1000)
    await repository.rpc(
        "save_document_extraction",
        {
            "p_document_id": str(document_id),
            "p_fields": extraction.fields,
            "p_confidence": {"score": extraction.confidence},
        },
    )
    await AuditWriter(repository).write(
        actor,
        tool_name=tool_name,
        source_ids=[str(document_id)],
        latency_ms=latency_ms,
        status="completed",
        safe_parameters={
            "document_id": str(document_id),
            "fields": list(extraction.fields),
        },
    )
