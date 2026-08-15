from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile, status

from sejuk_assistant.api.dependencies import authenticated_actor
from sejuk_assistant.auth.context import ActorContext
from sejuk_assistant.documents.intake import (
    DocumentIntakeError,
    DocumentManifest,
    SupabaseDocumentIntakeStore,
    prepare_document,
)

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
