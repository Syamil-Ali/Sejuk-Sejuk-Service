FROM python:3.12-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

RUN groupadd --system sejuk && useradd --system --gid sejuk --create-home sejuk
WORKDIR /app

COPY pyproject.toml requirements.lock ./
RUN python -m pip install --upgrade pip && pip install --requirement requirements.lock
COPY src ./src
RUN pip install --no-deps .

USER sejuk
EXPOSE 8000
CMD ["uvicorn", "sejuk_assistant.main:app", "--host", "0.0.0.0", "--port", "8000"]

