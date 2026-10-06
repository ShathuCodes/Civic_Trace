"""Configuration management using pydantic-settings."""

from pathlib import Path
from typing import Optional
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # API Keys & Providers
    gemini_api_key: Optional[str] = Field(default=None, alias="GEMINI_API_KEY")
    embedding_provider: str = Field(default="local", alias="EMBEDDING_PROVIDER")
    embedding_model: str = Field(
        default="sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
        alias="EMBEDDING_MODEL",
    )

    # Vector Database (Qdrant)
    qdrant_url: str = Field(default="http://localhost:6333", alias="QDRANT_URL")
    qdrant_api_key: Optional[str] = Field(default=None, alias="QDRANT_API_KEY")
    qdrant_collection: str = Field(default="sri_lanka_hansards", alias="QDRANT_COLLECTION")

    # Crawler Settings
    crawl_delay_seconds: float = Field(default=1.5, alias="CRAWL_DELAY_SECONDS")
    crawl_max_concurrency: int = Field(default=2, alias="CRAWL_MAX_CONCURRENCY")
    request_timeout_seconds: float = Field(default=60.0, alias="REQUEST_TIMEOUT_SECONDS")
    user_agent: str = Field(
        default="SriLankaHansardRAG/1.0 (Public Research Archive; contact: info@civictrace.local)",
        alias="USER_AGENT",
    )

    # OCR Settings
    ocr_enabled: bool = Field(default=True, alias="OCR_ENABLED")
    ocr_min_text_characters: int = Field(default=100, alias="OCR_MIN_TEXT_CHARACTERS")
    tesseract_cmd: Optional[str] = Field(default=None, alias="TESSERACT_CMD")

    # Chunking Settings
    chunk_target_tokens: int = Field(default=700, alias="CHUNK_TARGET_TOKENS")
    chunk_overlap_tokens: int = Field(default=100, alias="CHUNK_OVERLAP_TOKENS")

    # Date Range Filters
    start_date: Optional[str] = Field(default=None, alias="START_DATE")
    end_date: Optional[str] = Field(default=None, alias="END_DATE")

    # App Settings
    log_level: str = Field(default="INFO", alias="LOG_LEVEL")
    data_dir: Path = Field(default=Path("data"), alias="DATA_DIR")

    @property
    def manifests_dir(self) -> Path:
        return self.data_dir / "manifests"

    @property
    def raw_pdf_dir(self) -> Path:
        return self.data_dir / "raw" / "pdf"

    @property
    def extracted_dir(self) -> Path:
        return self.data_dir / "extracted"

    @property
    def languages_dir(self) -> Path:
        return self.data_dir / "languages"

    @property
    def chunks_dir(self) -> Path:
        return self.data_dir / "chunks"

    @property
    def reports_dir(self) -> Path:
        return self.data_dir / "reports"

    def ensure_directories(self) -> None:
        """Create standard data folder hierarchy if it does not exist."""
        for p in [
            self.manifests_dir,
            self.raw_pdf_dir,
            self.extracted_dir,
            self.languages_dir,
            self.chunks_dir,
            self.reports_dir,
        ]:
            p.mkdir(parents=True, exist_ok=True)


settings = Settings()
