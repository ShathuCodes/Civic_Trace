"""Comprehensive CLI interface for Sri Lanka Hansard RAG pipeline."""

import argparse
import asyncio
from datetime import datetime, timezone
import json
import logging
from pathlib import Path
import sys
from typing import Any, Dict, List, Optional
import uvicorn

from hansard_rag.config import settings
from hansard_rag.crawler.discovery import HansardDiscovery
from hansard_rag.crawler.downloader import HansardDownloader
from hansard_rag.crawler.parliament_client import ParliamentClient
from hansard_rag.crawler.state import CrawlState
from hansard_rag.chunking.semantic_chunker import SemanticChunker
from hansard_rag.embeddings.gemini import GeminiEmbeddingProvider
from hansard_rag.embeddings.local import LocalEmbeddingProvider
from hansard_rag.extraction.pdf_text import PDFExtractor
from hansard_rag.language.separator import LanguageSeparator
from hansard_rag.logging_config import setup_logging
from hansard_rag.models import HansardChunk, HansardDocument
from hansard_rag.vectorstore.qdrant_store import HansardVectorStore

setup_logging(settings.log_level)
logger = logging.getLogger("hansard_rag.cli")


async def run_discover(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    max_pages: Optional[int] = None,
) -> List[HansardDocument]:
    """Execute discovery phase."""
    async with ParliamentClient() as client:
        discovery = HansardDiscovery(client=client)
        docs = await discovery.discover_all(
            start_date=start_date or settings.start_date,
            end_date=end_date or settings.end_date,
            max_pages=max_pages,
        )
        print(f"\n[DISCOVERY] Completed. Total documents discovered: {len(docs)}")
        return docs


async def run_download(
    force: bool = False,
    document_id: Optional[str] = None,
    limit: Optional[int] = None,
) -> List[HansardDocument]:
    """Execute download phase."""
    discovery = HansardDiscovery()
    manifest = discovery.load_existing_manifest()
    docs = list(manifest.values())

    if document_id:
        docs = [d for d in docs if d.document_id == document_id]

    async with ParliamentClient() as client:
        downloader = HansardDownloader(client=client)
        updated = await downloader.download_all(docs, force=force, limit=limit)
        success = [d for d in updated if d.download_status in ("downloaded", "skipped")]
        failed = [d for d in updated if d.download_status == "failed"]
        print(f"\n[DOWNLOAD] Completed. Processed: {len(updated)} | Valid: {len(success)} | Failed: {len(failed)}")
        return updated


def run_extract(
    document_id: Optional[str] = None,
    limit: Optional[int] = None,
) -> int:
    """Execute text extraction and OCR fallback phase."""
    discovery = HansardDiscovery()
    manifest = discovery.load_existing_manifest()
    docs = list(manifest.values())

    if document_id:
        docs = [d for d in docs if d.document_id == document_id]

    # Only process downloaded or skipped docs
    ready_docs = [d for d in docs if d.local_pdf_path and Path(d.local_pdf_path).exists()]
    if limit:
        ready_docs = ready_docs[:limit]

    extractor = PDFExtractor(ocr_enabled=settings.ocr_enabled)
    extracted_count = 0

    for doc in ready_docs:
        try:
            pages, report = extractor.process_document(doc)
            extracted_count += 1
            print(f"[EXTRACT] {doc.sitting_date} -> {len(pages)} pages (Sinhala: {report['sinhala_characters']}, Tamil: {report['tamil_characters']}, Latin: {report['latin_characters']})")
        except Exception as e:
            logger.error("Failed extracting %s: %s", doc.document_id, e)

    print(f"\n[EXTRACT] Completed. Total documents extracted: {extracted_count}")
    return extracted_count


def run_separate_languages(
    document_id: Optional[str] = None,
    limit: Optional[int] = None,
) -> int:
    """Execute trilingual Unicode script separation phase."""
    from hansard_rag.models import ExtractedPage

    discovery = HansardDiscovery()
    manifest = discovery.load_existing_manifest()
    docs = list(manifest.values())

    if document_id:
        docs = [d for d in docs if d.document_id == document_id]

    ready_docs = [d for d in docs if d.local_pdf_path and Path(d.local_pdf_path).exists()]
    if limit:
        ready_docs = ready_docs[:limit]

    separator = LanguageSeparator()
    separated_count = 0

    for doc in ready_docs:
        year = doc.sitting_date[:4]
        pages_file = settings.extracted_dir / year / doc.sitting_date / "pages.jsonl"
        if not pages_file.exists():
            continue

        pages = []
        with open(pages_file, "r", encoding="utf-8") as pf:
            for line in pf:
                if line.strip():
                    pages.append(ExtractedPage.model_validate_json(line))

        segments = separator.process_pages(doc, pages)
        out_files = separator.export_language_files(doc, segments)
        separated_count += 1
        print(f"[SEPARATE] {doc.sitting_date} -> {len(segments)} segments exported ({out_files['si'].name}, {out_files['ta'].name}, {out_files['en'].name})")

    print(f"\n[SEPARATE] Completed. Total documents separated: {separated_count}")
    return separated_count


def run_chunk(
    document_id: Optional[str] = None,
    limit: Optional[int] = None,
) -> List[HansardChunk]:
    """Execute semantic vector chunking phase."""
    from hansard_rag.models import LanguageSegment

    discovery = HansardDiscovery()
    manifest = discovery.load_existing_manifest()
    docs = list(manifest.values())

    if document_id:
        docs = [d for d in docs if d.document_id == document_id]

    ready_docs = [d for d in docs if d.local_pdf_path and Path(d.local_pdf_path).exists()]
    if limit:
        ready_docs = ready_docs[:limit]

    chunker = SemanticChunker()
    all_chunks: List[HansardChunk] = []

    for doc in ready_docs:
        year = doc.sitting_date[:4]
        segments_file = settings.languages_dir / year / doc.sitting_date / "segments.jsonl"
        if not segments_file.exists():
            continue

        segments = []
        with open(segments_file, "r", encoding="utf-8") as sf:
            for line in sf:
                if line.strip():
                    segments.append(LanguageSegment.model_validate_json(line))

        chunks = chunker.process_all_languages(doc, segments)
        all_chunks.extend(chunks)
        print(f"[CHUNK] {doc.sitting_date} -> {len(chunks)} chunks created")

    chunker.export_chunks(all_chunks, append=True)
    print(f"\n[CHUNK] Completed. Total chunks generated: {len(all_chunks)}")
    return all_chunks


async def run_index(limit: Optional[int] = None) -> int:
    """Index chunks into Qdrant."""
    multi_file = settings.chunks_dir / "multilingual.jsonl"
    if not multi_file.exists():
        print("[INDEX] Error: chunks/multilingual.jsonl does not exist. Run chunk phase first.")
        return 0

    chunks: List[HansardChunk] = []
    with open(multi_file, "r", encoding="utf-8") as f:
        for line in f:
            if line.strip():
                chunks.append(HansardChunk.model_validate_json(line))

    if limit:
        chunks = chunks[:limit]

    if settings.embedding_provider.lower() == "gemini" and settings.gemini_api_key:
        embedder = GeminiEmbeddingProvider()
    else:
        embedder = LocalEmbeddingProvider()

    vs = HansardVectorStore(embedder=embedder)
    upserted = await vs.upsert_chunks(chunks)
    print(f"\n[INDEX] Completed. Total points upserted to Qdrant: {upserted}")
    return upserted


def run_validate() -> Dict[str, Any]:
    """Execute audit and generate validation_report.json and summary CSVs."""
    settings.reports_dir.mkdir(parents=True, exist_ok=True)
    settings.manifests_dir.mkdir(parents=True, exist_ok=True)

    manifest_file = settings.manifests_dir / "documents.jsonl"
    docs: List[HansardDocument] = []
    if manifest_file.exists():
        with open(manifest_file, "r", encoding="utf-8") as f:
            for line in f:
                if line.strip():
                    docs.append(HansardDocument.model_validate_json(line))

    # Read chunks
    chunks_file = settings.chunks_dir / "multilingual.jsonl"
    chunk_count = 0
    chunks_by_lang: Dict[str, int] = {"si": 0, "ta": 0, "en": 0, "mixed": 0}
    if chunks_file.exists():
        with open(chunks_file, "r", encoding="utf-8") as cf:
            for line in cf:
                if line.strip():
                    c = HansardChunk.model_validate_json(line)
                    chunk_count += 1
                    chunks_by_lang[c.language] = chunks_by_lang.get(c.language, 0) + 1

    # Audit downloads and hashes
    downloaded = 0
    failed = 0
    hashes = set()
    duplicate_hashes = []

    for d in docs:
        if d.local_pdf_path and Path(d.local_pdf_path).exists():
            downloaded += 1
        elif d.download_status == "failed":
            failed += 1

        if d.sha256:
            if d.sha256 in hashes:
                duplicate_hashes.append({"document_id": d.document_id, "sha256": d.sha256})
            else:
                hashes.add(d.sha256)

    # Dates
    dates = sorted([d.sitting_date for d in docs])
    earliest = dates[0] if dates else "N/A"
    latest = dates[-1] if dates else "N/A"

    report = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "total_listing_records_discovered": len(docs),
        "total_unique_pdfs": len(hashes) or len(docs),
        "earliest_sitting_date": earliest,
        "latest_sitting_date": latest,
        "pdfs_successfully_downloaded": downloaded,
        "pdfs_failed": failed,
        "total_chunks_indexed": chunk_count,
        "chunks_by_language": chunks_by_lang,
        "duplicate_hash_count": len(duplicate_hashes),
        "embedding_provider": settings.embedding_provider,
        "qdrant_collection": settings.qdrant_collection,
        "status": "VALID" if downloaded > 0 else "PARTIAL",
    }

    report_file = settings.manifests_dir / "validation_report.json"
    with open(report_file, "w", encoding="utf-8") as rf:
        json.dump(report, rf, indent=2)

    # Export coverage.csv
    cov_file = settings.reports_dir / "coverage.csv"
    with open(cov_file, "w", encoding="utf-8") as f:
        f.write("sitting_date,document_id,download_status,pdf_url\n")
        for d in docs:
            f.write(f"{d.sitting_date},{d.document_id},{d.download_status},{d.official_pdf_url}\n")

    print(f"\n[VALIDATION] Report generated: {report_file}")
    print(json.dumps(report, indent=2))
    return report


async def run_sync_pipeline(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    force: bool = False,
    limit: Optional[int] = None,
) -> Dict[str, Any]:
    """End-to-end incremental sync: discover -> download -> extract -> separate -> chunk -> index -> validate."""
    print("=" * 60)
    print("STARTING HANSARD INCREMENTAL SYNC PIPELINE")
    print("=" * 60)

    # 1. Discover
    docs = await run_discover(start_date=start_date, end_date=end_date)

    # 2. Download
    updated = await run_download(force=force, limit=limit)

    # 3. Extract
    extracted_count = run_extract(limit=limit)

    # 4. Separate
    separated_count = run_separate_languages(limit=limit)

    # 5. Chunk
    chunks = run_chunk(limit=limit)

    # 6. Index
    indexed_count = await run_index(limit=limit)

    # 7. Validate
    report = run_validate()

    return {
        "discovered": len(docs),
        "downloaded": len(updated),
        "extracted": extracted_count,
        "separated": separated_count,
        "chunked": len(chunks),
        "indexed": indexed_count,
        "validation": report,
    }


def main():
    """CLI Argument Parser and command router."""
    parser = argparse.ArgumentParser(description="Sri Lanka Parliament Hansard Multilingual RAG CLI")
    subparsers = parser.add_subparsers(dest="command", required=True)

    # discover
    p_disc = subparsers.add_parser("discover", help="Discover Hansards from parliament.lk")
    p_disc.add_argument("--start-date", type=str, help="Start date (YYYY-MM-DD)")
    p_disc.add_argument("--end-date", type=str, help="End date (YYYY-MM-DD)")
    p_disc.add_argument("--max-pages", type=int, help="Maximum pages to scrape")

    # download
    p_down = subparsers.add_parser("download", help="Download discovered PDFs")
    p_down.add_argument("--force", action="store_true", help="Force redownload")
    p_down.add_argument("--document-id", type=str, help="Download specific document")
    p_down.add_argument("--limit", type=int, help="Limit number of documents")

    # extract
    p_ext = subparsers.add_parser("extract", help="Extract text and OCR")
    p_ext.add_argument("--document-id", type=str)
    p_ext.add_argument("--limit", type=int)

    # separate-languages
    p_sep = subparsers.add_parser("separate-languages", help="Separate into si, ta, en")
    p_sep.add_argument("--document-id", type=str)
    p_sep.add_argument("--limit", type=int)

    # chunk
    p_chk = subparsers.add_parser("chunk", help="Generate vector chunks")
    p_chk.add_argument("--document-id", type=str)
    p_chk.add_argument("--limit", type=int)

    # embed & index
    p_idx = subparsers.add_parser("index", help="Index chunks into Qdrant")
    p_idx.add_argument("--limit", type=int)

    # sync
    p_sync = subparsers.add_parser("sync", help="Run full incremental sync pipeline")
    p_sync.add_argument("--start-date", type=str)
    p_sync.add_argument("--end-date", type=str)
    p_sync.add_argument("--force", action="store_true")
    p_sync.add_argument("--limit", type=int)

    # validate
    subparsers.add_parser("validate", help="Run audit and generate validation report")

    # serve
    p_srv = subparsers.add_parser("serve", help="Start FastAPI service")
    p_srv.add_argument("--host", default="0.0.0.0")
    p_srv.add_argument("--port", type=int, default=8000)
    p_srv.add_argument("--reload", action="store_true")

    args = parser.parse_args()

    if args.command == "discover":
        asyncio.run(run_discover(start_date=args.start_date, end_date=args.end_date, max_pages=args.max_pages))
    elif args.command == "download":
        asyncio.run(run_download(force=args.force, document_id=args.document_id, limit=args.limit))
    elif args.command == "extract":
        run_extract(document_id=args.document_id, limit=args.limit)
    elif args.command == "separate-languages":
        run_separate_languages(document_id=args.document_id, limit=args.limit)
    elif args.command == "chunk":
        run_chunk(document_id=args.document_id, limit=args.limit)
    elif args.command == "index":
        asyncio.run(run_index(limit=args.limit))
    elif args.command == "sync":
        asyncio.run(run_sync_pipeline(start_date=args.start_date, end_date=args.end_date, force=args.force, limit=args.limit))
    elif args.command == "validate":
        run_validate()
    elif args.command == "serve":
        uvicorn.run("hansard_rag.api.main:app", host=args.host, port=args.port, reload=args.reload)


if __name__ == "__main__":
    main()
