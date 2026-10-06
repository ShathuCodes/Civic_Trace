"""Semantic, speaker-preserving multilingual chunker for vector search."""

import csv
import json
import logging
from pathlib import Path
from typing import Dict, List, Optional

from hansard_rag.chunking.metadata import compute_chunk_id, compute_text_sha256, estimate_multilingual_tokens
from hansard_rag.chunking.speaker_parser import parse_parliamentary_metadata, parse_speaker_and_role
from hansard_rag.config import settings
from hansard_rag.models import HansardChunk, HansardDocument, LanguageSegment

logger = logging.getLogger(__name__)


class SemanticChunker:
    """Creates coherent multilingual chunks respecting speaker turns and parliamentary bounds."""

    def __init__(
        self,
        target_tokens: int = settings.chunk_target_tokens,
        overlap_tokens: int = settings.chunk_overlap_tokens,
    ):
        self.target_tokens = target_tokens
        self.overlap_tokens = overlap_tokens

    def chunk_segments_for_language(
        self,
        doc: HansardDocument,
        segments: List[LanguageSegment],
        language: str,
    ) -> List[HansardChunk]:
        """Group segments belonging to a single language into ~700 token chunks."""
        lang_segments = [s for s in segments if s.language == language]
        if not lang_segments:
            return []

        chunks: List[HansardChunk] = []
        year = int(doc.sitting_date[:4])

        current_texts: List[str] = []
        current_tokens = 0
        current_page_start = lang_segments[0].pdf_page_start
        current_page_end = lang_segments[0].pdf_page_end
        current_col_start = lang_segments[0].printed_column_start
        current_col_end = lang_segments[0].printed_column_end
        current_speaker: Optional[str] = None
        current_role: Optional[str] = None
        current_section: Optional[str] = None
        current_question: Optional[str] = None
        current_bill: Optional[str] = None
        extraction_methods: List[str] = []

        for seg in lang_segments:
            seg_tokens = estimate_multilingual_tokens(seg.text)
            speaker, role = parse_speaker_and_role(seg.text)
            section, q_num, bill = parse_parliamentary_metadata(seg.text)

            if seg.extraction_method and seg.extraction_method not in extraction_methods:
                extraction_methods.append(seg.extraction_method)

            # Flush condition:
            # 1. New speaker turn AND current chunk has accumulated at least half target tokens; OR
            # 2. Accumulated tokens exceed target_tokens
            is_new_speaker = speaker and current_speaker and (speaker != current_speaker)
            should_flush = (
                (current_tokens + seg_tokens > self.target_tokens and current_tokens >= 300)
                or (is_new_speaker and current_tokens >= 300)
            )

            if should_flush and current_texts:
                full_text = "\n\n".join(current_texts)
                chunk_id = compute_chunk_id(doc.document_id, language, current_page_start, current_page_end, full_text)

                chunk = HansardChunk(
                    chunk_id=chunk_id,
                    document_id=doc.document_id,
                    sitting_date=doc.sitting_date,
                    year=year,
                    language=language,
                    title=doc.title,
                    section=current_section,
                    speaker=current_speaker,
                    speaker_role=current_role,
                    question_number=current_question,
                    bill_or_motion=current_bill,
                    pdf_page_start=current_page_start,
                    pdf_page_end=current_page_end,
                    printed_column_start=current_col_start,
                    printed_column_end=current_col_end,
                    source_url=doc.official_pdf_url,
                    text=full_text,
                    text_sha256=compute_text_sha256(full_text),
                    token_count=estimate_multilingual_tokens(full_text),
                    extraction_methods=list(extraction_methods),
                    quality_flags=[],
                )
                chunks.append(chunk)

                # Reset with overlap
                if self.overlap_tokens > 0 and len(current_texts) > 1:
                    last_text = current_texts[-1]
                    current_texts = [last_text, seg.text]
                    current_tokens = estimate_multilingual_tokens(last_text) + seg_tokens
                else:
                    current_texts = [seg.text]
                    current_tokens = seg_tokens

                current_page_start = seg.pdf_page_start
                current_page_end = seg.pdf_page_end
                current_col_start = seg.printed_column_start
                current_col_end = seg.printed_column_end
                current_speaker = speaker
                current_role = role
                current_section = section
                current_question = q_num
                current_bill = bill

            else:
                current_texts.append(seg.text)
                current_tokens += seg_tokens
                current_page_end = seg.pdf_page_end
                if seg.printed_column_end:
                    current_col_end = seg.printed_column_end
                if not current_col_start and seg.printed_column_start:
                    current_col_start = seg.printed_column_start
                if speaker and not current_speaker:
                    current_speaker = speaker
                    current_role = role
                if section and not current_section:
                    current_section = section
                if q_num and not current_question:
                    current_question = q_num
                if bill and not current_bill:
                    current_bill = bill

        # Flush remaining buffer
        if current_texts:
            full_text = "\n\n".join(current_texts)
            chunk_id = compute_chunk_id(doc.document_id, language, current_page_start, current_page_end, full_text)
            chunk = HansardChunk(
                chunk_id=chunk_id,
                document_id=doc.document_id,
                sitting_date=doc.sitting_date,
                year=year,
                language=language,
                title=doc.title,
                section=current_section,
                speaker=current_speaker,
                speaker_role=current_role,
                question_number=current_question,
                bill_or_motion=current_bill,
                pdf_page_start=current_page_start,
                pdf_page_end=current_page_end,
                printed_column_start=current_col_start,
                printed_column_end=current_col_end,
                source_url=doc.official_pdf_url,
                text=full_text,
                text_sha256=compute_text_sha256(full_text),
                token_count=estimate_multilingual_tokens(full_text),
                extraction_methods=list(extraction_methods),
                quality_flags=[],
            )
            chunks.append(chunk)

        return chunks

    def process_all_languages(
        self,
        doc: HansardDocument,
        segments: List[LanguageSegment],
    ) -> List[HansardChunk]:
        """Generate chunks across si, ta, en, and mixed streams."""
        all_chunks: List[HansardChunk] = []
        for lang in ["si", "ta", "en", "mixed"]:
            chunks = self.chunk_segments_for_language(doc, segments, lang)
            all_chunks.extend(chunks)
        return all_chunks

    def export_chunks(self, all_chunks: List[HansardChunk], append: bool = True) -> Dict[str, Path]:
        """Write out si.jsonl, ta.jsonl, en.jsonl, multilingual.jsonl, and CSV report."""
        settings.chunks_dir.mkdir(parents=True, exist_ok=True)
        mode = "a" if append else "w"

        files = {
            "si": settings.chunks_dir / "si.jsonl",
            "ta": settings.chunks_dir / "ta.jsonl",
            "en": settings.chunks_dir / "en.jsonl",
            "multilingual": settings.chunks_dir / "multilingual.jsonl",
        }

        # Track existing IDs in files to ensure idempotency when appending
        existing_ids: Dict[str, set] = {"si": set(), "ta": set(), "en": set(), "multilingual": set()}
        if append:
            for k, p in files.items():
                if p.exists():
                    with open(p, "r", encoding="utf-8") as f:
                        for line in f:
                            try:
                                obj = json.loads(line)
                                existing_ids[k].add(obj["chunk_id"])
                            except Exception:
                                pass

        counts = {"si": 0, "ta": 0, "en": 0, "multilingual": 0}

        with open(files["multilingual"], mode, encoding="utf-8") as f_multi:
            for chunk in all_chunks:
                # Add to multilingual file
                if chunk.chunk_id not in existing_ids["multilingual"]:
                    f_multi.write(chunk.model_dump_json() + "\n")
                    existing_ids["multilingual"].add(chunk.chunk_id)
                    counts["multilingual"] += 1

                # Add to per-language file
                if chunk.language in ("si", "ta", "en"):
                    target_file = files[chunk.language]
                    if chunk.chunk_id not in existing_ids[chunk.language]:
                        with open(target_file, "a", encoding="utf-8") as f_lang:
                            f_lang.write(chunk.model_dump_json() + "\n")
                        existing_ids[chunk.language].add(chunk.chunk_id)
                        counts[chunk.language] += 1

        logger.info(
            "Exported chunks: si=%d, ta=%d, en=%d, total_multi=%d",
            counts["si"],
            counts["ta"],
            counts["en"],
            counts["multilingual"],
        )
        return files
