.PHONY: help install lint typecheck test discover download extract separate chunk embed index sync validate serve up down clean

help:
	@echo "Available commands:"
	@echo "  make install     Install dependencies"
	@echo "  make lint        Run ruff linter and formatter check"
	@echo "  make typecheck   Run mypy type checker"
	@echo "  make test        Run pytest test suite"
	@echo "  make discover    Run discovery of Parliament Hansards"
	@echo "  make sync        Run incremental end-to-end sync pipeline"
	@echo "  make validate    Run validation and audit reports"
	@echo "  make serve       Start FastAPI application"
	@echo "  make up          Start Docker Compose services (Qdrant + App)"
	@echo "  make down        Stop Docker Compose services"

install:
	pip install -e ".[dev]"

lint:
	ruff check src tests
	ruff format --check src tests

typecheck:
	mypy src

test:
	pytest -v

discover:
	python -m hansard_rag.cli discover

download:
	python -m hansard_rag.cli download

extract:
	python -m hansard_rag.cli extract

separate:
	python -m hansard_rag.cli separate-languages

chunk:
	python -m hansard_rag.cli chunk

embed:
	python -m hansard_rag.cli embed

index:
	python -m hansard_rag.cli index

sync:
	python -m hansard_rag.cli sync

validate:
	python -m hansard_rag.cli validate

serve:
	uvicorn hansard_rag.api.main:app --host 0.0.0.0 --port 8000 --reload

up:
	docker compose up -d

down:
	docker compose down

clean:
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete
