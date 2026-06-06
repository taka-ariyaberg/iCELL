# Pinned to specific patch versions so rebuilds are deterministic.
# Bump these intentionally; do not relax to floating tags.
FROM node:20.18.0-slim AS frontend-build

WORKDIR /build/frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build


FROM python:3.14.5-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PYTHONPATH=/workspace/src \
    ICELL_RESOURCE_ROOT=/workspace \
    ICELL_RUNTIME_ROOT=/workspace

WORKDIR /workspace

COPY backend/requirements.txt /tmp/backend-requirements.txt
RUN pip install --upgrade pip \
    && pip install -r /tmp/backend-requirements.txt

COPY README.md pyproject.toml /workspace/
COPY backend /workspace/backend
COPY config /workspace/config
COPY data /workspace/data
COPY scripts /workspace/scripts
COPY src /workspace/src
COPY tests /workspace/tests
COPY --from=frontend-build /build/frontend/dist /workspace/frontend/dist

EXPOSE 8000

CMD ["uvicorn", "backend.app:app", "--host", "0.0.0.0", "--port", "8000"]