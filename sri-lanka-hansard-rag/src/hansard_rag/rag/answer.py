"""Multilingual QA answer synthesizer grounded strictly in retrieved Hansard evidence."""

import asyncio
import logging
from typing import List, Optional

from hansard_rag.config import settings
from hansard_rag.models import AskResponse, Citation, EvidenceItem
from hansard_rag.rag.prompts import STRICT_RAG_SYSTEM_PROMPT, USER_PROMPT_TEMPLATE
from hansard_rag.rag.retrieval import HansardRetriever

logger = logging.getLogger(__name__)

INSUFFICIENT_MESSAGES = {
    "si": "ලබා දී ඇති හැන්සාඩ් වාර්තාවල මෙම ප්‍රශ්නයට පිළිතුරු දීමට ප්‍රමාණවත් සාක්ෂි නොමැත.",
    "ta": "இந்த கேள்விக்கு பதிலளிக்க கிடைக்கக்கூடிய ஹன்சார்ட் ஆதாரங்கள் போதுமானதாக இல்லை.",
    "en": "The available Hansard evidence is insufficient to answer this question.",
}

LANGUAGE_LABELS = {
    "si": "Sinhala",
    "ta": "Tamil",
    "en": "English",
}


class HansardRAGService:
    """End-to-end RAG question answering pipeline."""

    def __init__(self, retriever: HansardRetriever):
        self.retriever = retriever
        self.api_key = settings.gemini_api_key

    def _format_context(self, evidence: List[EvidenceItem]) -> str:
        """Format retrieved excerpts with citation labels."""
        blocks = []
        for idx, item in enumerate(evidence, start=1):
            header = f"[Excerpt {idx} | Date: {item.sitting_date} | PDF Page: {item.pdf_page} | Speaker: {item.speaker or 'Unspecified'} | Lang: {item.language}]"
            blocks.append(f"{header}\n{item.text}")
        return "\n\n".join(blocks)

    async def _generate_with_gemini(
        self,
        question: str,
        context: str,
        target_language: str,
    ) -> str:
        """Generate grounded answer using Gemini LLM."""
        prompt = USER_PROMPT_TEMPLATE.format(
            context=context,
            question=question,
            target_language=LANGUAGE_LABELS.get(target_language, "English"),
        )

        loop = asyncio.get_running_loop()

        def _call() -> str:
            try:
                import google.generativeai as genai
                genai.configure(api_key=self.api_key)
                for model_name in ["gemini-3.8-flash", "gemini-2.5-flash", "gemini-1.5-flash"]:
                    try:
                        model = genai.GenerativeModel(
                            model_name=model_name,
                            system_instruction=STRICT_RAG_SYSTEM_PROMPT,
                        )
                        resp = model.generate_content(prompt, generation_config={"temperature": 0.1})
                        if resp and resp.text:
                            return resp.text.strip()
                    except Exception as me:
                        logger.debug("Model %s generation attempt failed: %s", model_name, me)
                        continue
            except ImportError:
                pass

            try:
                from google import genai
                client = genai.Client(api_key=self.api_key)
                response = client.models.generate_content(
                    model="gemini-3.8-flash",
                    contents=prompt,
                    config={
                        "system_instruction": STRICT_RAG_SYSTEM_PROMPT,
                        "temperature": 0.1,
                    },
                )
                return (response.text or "").strip()
            except Exception as e:
                raise RuntimeError(f"Gemini client generation failed: {e}")

        return await loop.run_in_executor(None, _call)

    def _generate_extractive_fallback(
        self,
        question: str,
        evidence: List[EvidenceItem],
        target_language: str,
    ) -> str:
        """Deterministic extractive grounded response when running offline."""
        if not evidence:
            return INSUFFICIENT_MESSAGES.get(target_language, INSUFFICIENT_MESSAGES["en"])

        top = evidence[0]
        date_str = top.sitting_date or "Unknown Date"
        page_str = f"page {top.pdf_page}" if top.pdf_page else "official record"

        if target_language == "si":
            return (
                f"{date_str} දින හැන්සාඩ් වාර්තාවේ ({page_str}) සඳහන් පරිදි:\n\n"
                f"\"{top.text[:400]}...\"\n\n"
                f"[මූලාශ්‍රය: {top.source_url}]"
            )
        elif target_language == "ta":
            return (
                f"{date_str} திகதியிட்ட ஹன்சார்ட் பதிவின்படி ({page_str}):\n\n"
                f"\"{top.text[:400]}...\"\n\n"
                f"[ஆதாரம்: {top.source_url}]"
            )
        else:
            return (
                f"According to the Hansard of {date_str} ({page_str}):\n\n"
                f"\"{top.text[:400]}...\"\n\n"
                f"[Source: {top.source_url}]"
            )

    async def answer(
        self,
        question: str,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        language: Optional[str] = "auto",
        top_k: int = 8,
    ) -> AskResponse:
        """Answer question with verified citations and structured evidence."""
        evidence, citations, detected_lang = await self.retriever.retrieve(
            query=question,
            start_date=start_date,
            end_date=end_date,
            language=language,
            top_k=top_k,
        )

        answer_lang = detected_lang if language in (None, "auto") else language

        # Check if evidence is empty
        if not evidence:
            ans_text = INSUFFICIENT_MESSAGES.get(answer_lang, INSUFFICIENT_MESSAGES["en"])
            return AskResponse(
                answer=ans_text,
                answer_language=answer_lang,
                citations=[],
                evidence=[],
            )

        context_str = self._format_context(evidence)

        # Generate answer via Gemini if API key is configured
        if self.api_key:
            try:
                ans_text = await self._generate_with_gemini(question, context_str, answer_lang)
            except Exception as e:
                logger.warning("Gemini generation failed (%s). Falling back to grounded excerpt.", e)
                ans_text = self._generate_extractive_fallback(question, evidence, answer_lang)
        else:
            ans_text = self._generate_extractive_fallback(question, evidence, answer_lang)

        return AskResponse(
            answer=ans_text.strip(),
            answer_language=answer_lang,
            citations=citations,
            evidence=evidence,
        )
