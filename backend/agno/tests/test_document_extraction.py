from __future__ import annotations

import io
import zipfile
from types import SimpleNamespace
from uuid import uuid4

import pytest

from sejuk_assistant.auth.context import ActorContext, Role
from sejuk_assistant.documents.extraction import (
    PAYMENT_INSTRUCTIONS,
    DocumentExtractor,
    ExtractedDocumentFields,
    ExtractedPaymentFields,
    assert_extraction_access,
    assert_payment_extraction_access,
    docx_text,
    normalize_amount,
    normalize_payment_method,
    order_fields_from_model,
    payment_fields_from_model,
    split_building_number,
)
from sejuk_assistant.settings import Settings


def settings(**overrides: object) -> Settings:
    return Settings(
        environment="test",
        GOOGLE_API_KEY="test-key",
        model_id="gemini-2.5-flash",
        _env_file=None,
        **overrides,
    )


def actor(role: Role) -> ActorContext:
    return ActorContext(uuid4(), role, uuid4(), "User", uuid4())


class FakeAgent:
    def __init__(self, content: object) -> None:
        self.content = content
        self.calls: list[dict[str, object]] = []

    async def arun(self, input: str, **kwargs: object) -> SimpleNamespace:
        self.calls.append({"input": input, **kwargs})
        return SimpleNamespace(content=self.content)


def test_extraction_access_is_admin_or_manager_only() -> None:
    assert_extraction_access(actor(Role.ADMIN))
    assert_extraction_access(actor(Role.MANAGER))
    with pytest.raises(PermissionError):
        assert_extraction_access(actor(Role.TECHNICIAN))
    assert_payment_extraction_access(actor(Role.ADMIN))
    assert_payment_extraction_access(actor(Role.MANAGER))
    assert_payment_extraction_access(actor(Role.TECHNICIAN))


@pytest.mark.asyncio
async def test_extract_parses_structured_fields() -> None:
    agent = FakeAgent(
        ExtractedDocumentFields(
            customer_name="Ahmad",
            customer_phone="0123456789",
            address_building="22",
            address_line_1="Jalan Teknologi",
            address_postcode="63000",
            address_city="Cyberjaya",
            address_state="Selangor",
            service_type="Cleaning",
            service_details="Clean indoor unit",
            amount="260.00",
            date="2026-08-20",
            confidence=0.93,
        )
    )
    extractor = DocumentExtractor(settings(), agent=agent)
    result = order_fields_from_model(await extractor.extract(b"pdf-bytes", "application/pdf"))
    assert result.fields["customerName"] == "Ahmad"
    assert result.fields["customerPhone"] == "0123456789"
    assert result.fields["building"] == "22"
    assert result.fields["address1"] == "Jalan Teknologi"
    assert result.fields["postcode"] == "63000"
    assert result.fields["city"] == "Cyberjaya"
    assert result.fields["state"] == "Selangor"
    assert result.fields["serviceType"] == "Cleaning"
    assert result.fields["amount"] == "260.00"
    assert result.confidence == pytest.approx(0.93)
    files = agent.calls[0]["files"]
    assert isinstance(files, list) and files[0].mime_type == "application/pdf"


@pytest.mark.asyncio
async def test_payment_extract_maps_receipt_fields() -> None:
    agent = FakeAgent(
        ExtractedPaymentFields(
            payment_amount="RM 1,150.00",
            payment_method="E-Wallet (DuitNow)",
            payment_date="2026-08-18",
            receipt_number="RCPT-118",
            customer_name="Nurul Huda",
            confidence=0.94,
        )
    )
    extractor = DocumentExtractor(
        settings(),
        agent=agent,
        output_schema=ExtractedPaymentFields,
        instructions=PAYMENT_INSTRUCTIONS,
    )
    result = payment_fields_from_model(await extractor.extract(b"receipt.png", "image/png"))
    assert result.fields["paymentAmount"] == "1150.00"
    assert result.fields["paymentMethod"] == "E-Wallet"
    assert result.fields["paymentDate"] == "2026-08-18"
    assert result.fields["receiptNumber"] == "RCPT-118"
    assert result.confidence == pytest.approx(0.94)
    images = agent.calls[0]["images"]
    assert isinstance(images, list) and images[0].mime_type == "image/png"


@pytest.mark.asyncio
async def test_extract_rejects_invalid_model_output() -> None:
    extractor = DocumentExtractor(settings(), agent=FakeAgent("not a model"))
    with pytest.raises(RuntimeError):
        await extractor.extract(b"x", "text/plain")


@pytest.mark.asyncio
async def test_text_documents_are_sent_as_the_user_message() -> None:
    agent = FakeAgent(ExtractedDocumentFields(customer_name="Mei", confidence=0.9))
    extractor = DocumentExtractor(settings(), agent=agent)
    await extractor.extract(b"Customer: Mei Ling", "text/plain")
    assert "Customer: Mei Ling" in str(agent.calls[0]["input"])
    assert "files" not in agent.calls[0]
    assert "images" not in agent.calls[0]


def test_docx_text_extracts_paragraphs() -> None:
    xml = (
        b'<?xml version="1.0"?>'
        b'<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
        b"<w:body><w:p><w:r><w:t>Customer Ahmad</w:t></w:r></w:p>"
        b"<w:p><w:r><w:t>Service Repair</w:t></w:r></w:p></w:body></w:document>"
    )
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w") as archive:
        archive.writestr("word/document.xml", xml)
    assert docx_text(buffer.getvalue()) == "Customer Ahmad\nService Repair"


def test_split_building_number_separates_number_from_street() -> None:
    assert split_building_number("22, Jalan Teknologi") == ("22", "Jalan Teknologi")
    assert split_building_number("No. 12, Jalan Sejuk") == ("12", "Jalan Sejuk")
    assert split_building_number("Jalan Teknologi") is None
    assert split_building_number("") is None


def test_normalize_amount_keeps_decimals() -> None:
    assert normalize_amount("RM 1,150.00") == "1150.00"
    assert normalize_amount("1,150.00") == "1150.00"
    assert normalize_amount("RM260.00") == "260.00"
    assert normalize_amount("") == ""


def test_normalize_payment_method_maps_variants() -> None:
    assert normalize_payment_method("E-Wallet") == "E-Wallet"
    assert normalize_payment_method("DuitNow QR") == "E-Wallet"
    assert normalize_payment_method("Bank Transfer") == "Bank Transfer"
    assert normalize_payment_method("CASH") == "Cash"
    assert normalize_payment_method("Unknown") == ""
