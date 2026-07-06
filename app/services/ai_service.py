from dataclasses import dataclass
import logging
import time

import httpx

from google import genai
from google.genai import errors, types

from app.core.config import settings


logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class SummaryResult:
    success: bool
    summary: str | None = None
    error: str | None = None
    error_type: str | None = None
    status_code: int = 200


@dataclass(frozen=True)
class EmbeddingResult:
    success: bool
    embedding: list[float] | None = None
    error: str | None = None
    error_type: str | None = None
    status_code: int = 200


@dataclass(frozen=True)
class AnswerResult:
    success: bool
    answer: str | None = None
    error: str | None = None
    error_type: str | None = None
    status_code: int = 200


@dataclass(frozen=True)
class GeminiSettings:
    api_key: str | None
    model_name: str
    embedding_model_name: str
    timeout_seconds: int
    max_chunk_chars: int = 12000
    max_attempts: int = 3


class GeminiSummaryService:
    def __init__(self):
        self.settings = GeminiSettings(
            api_key=settings.gemini_api_key,
            model_name=settings.gemini_model_name,
            embedding_model_name=settings.gemini_embedding_model,
            timeout_seconds=settings.gemini_timeout_seconds,
        )

    def is_configured(self) -> bool:
        return bool(self.settings.api_key)

    def configuration_status(self) -> SummaryResult:
        if self.is_configured():
            return SummaryResult(success=True)

        return SummaryResult(
            success=False,
            error="GEMINI_API_KEY is not configured in .env.",
            error_type="configuration_error",
            status_code=503,
        )

    def _build_prompt(self, extracted_text: str, document_title: str) -> str:
        return f"""You are an expert study assistant creating concise, high-quality notes from a document.

Return clean Markdown only. Do not mention policies, disclaimers, or that you are an AI.

Use these sections in this exact order:
1. Executive Summary
2. Key Concepts
3. Important Definitions
4. Important Formulas (if any)
5. Important Dates/Numbers (if any)
6. Main Takeaways
7. 5 Flashcards
8. 10 Quiz Questions with answers

Rules:
- Keep the summary concise but useful for studying and revision.
- If a section has no relevant content, write "Not present in the source.".
- Preserve exact formulas, terms, names, dates, and numbers when present.
- Use bullet lists where appropriate.
- Write the flashcards as Q/A pairs.
- Write the quiz questions with the answer immediately beneath each question.
- Prefer factual, source-grounded phrasing over speculation.
- Do not invent missing information.

Document title: {document_title}

Source text:
{extracted_text}
"""

    def _build_merge_prompt(self, summaries: list[str], document_title: str) -> str:
        joined_summaries = "\n\n---\n\n".join(summaries)
        return f"""You are consolidating multiple partial summaries of the same document.

Return clean Markdown only using these sections in this exact order:
1. Executive Summary
2. Key Concepts
3. Important Definitions
4. Important Formulas (if any)
5. Important Dates/Numbers (if any)
6. Main Takeaways
7. 5 Flashcards
8. 10 Quiz Questions with answers

Rules:
- Merge overlapping information and remove repetition.
- Keep the final result concise and study-friendly.
- Preserve correct formulas, names, dates, and numbers.
- If a section has no relevant content, write "Not present in the source.".
- Do not invent missing information.

Document title: {document_title}

Partial summaries:
{joined_summaries}
"""

    def _build_rag_prompt(self, question: str, document_title: str, context_blocks: list[dict]) -> str:
        context_text = "\n\n".join(
            f"[Page {block['page_number']}] {block['chunk_text']}" for block in context_blocks
        )
        return f"""You are a document question-answering assistant.

Answer ONLY using the provided document context.
If the answer is not contained in the context, respond with exactly:
I couldn't find this information in the uploaded document.

Do not use outside knowledge. Do not hallucinate.
When you use facts from the context, cite the page number inline like (p. 3).
Follow the user's requested format and quantity exactly when the context supports it.

If the user asks for MCQs or multiple-choice questions:
- Generate exactly the requested number.
- For each MCQ include:
  Question
  A)
  B)
  C)
  D)
  Correct Answer
  Short Explanation
- Ground every question and explanation in the provided context.

If the user asks for viva questions, generate exactly the requested number and include concise model answers.
If the user asks for a chapter, section, formula, conclusion, summary, or explanation, answer directly and structure the response with clear Markdown headings or bullets.
Do not stop midway through lists. Complete every requested item.

Document title: {document_title}

Question: {question}

Context:
{context_text}
"""

    def _split_text(self, extracted_text: str) -> list[str]:
        normalized_text = extracted_text.strip()
        if len(normalized_text) <= self.settings.max_chunk_chars:
            return [normalized_text]

        chunks: list[str] = []
        current_chunk: list[str] = []
        current_length = 0

        for paragraph in normalized_text.splitlines():
            paragraph = paragraph.strip()
            if not paragraph:
                continue

            paragraph_length = len(paragraph) + 1
            if paragraph_length > self.settings.max_chunk_chars:
                if current_chunk:
                    chunks.append("\n".join(current_chunk))
                    current_chunk = []
                    current_length = 0

                start = 0
                while start < len(paragraph):
                    end = min(start + self.settings.max_chunk_chars, len(paragraph))
                    chunks.append(paragraph[start:end])
                    start = end
                continue

            if current_length + paragraph_length > self.settings.max_chunk_chars and current_chunk:
                chunks.append("\n".join(current_chunk))
                current_chunk = [paragraph]
                current_length = paragraph_length
            else:
                current_chunk.append(paragraph)
                current_length += paragraph_length

        if current_chunk:
            chunks.append("\n".join(current_chunk))

        return chunks

    def _build_client(self):
        return genai.Client(
            api_key=self.settings.api_key,
            http_options=types.HttpOptions(
                clientArgs={"timeout": self.settings.timeout_seconds}
            ),
        )

    def _extract_embedding_values(self, response) -> list[float]:
        embeddings = getattr(response, "embeddings", None) or []
        if not embeddings:
            return []

        first_embedding = embeddings[0]
        return list(getattr(first_embedding, "values", []) or [])

    def _is_transient_exception(self, exc: Exception) -> bool:
        if isinstance(exc, (TimeoutError, httpx.TimeoutException, httpx.NetworkError)):
            return True

        if isinstance(exc, (errors.ServerError, errors.APIError)):
            status_code = getattr(exc, "status_code", None) or getattr(exc, "code", None)
            return status_code in {429, 500, 502, 503, 504}

        return False

    def _call_gemini(
        self,
        prompt: str,
        max_output_tokens: int = 1600,
        thinking_budget: int | None = None,
        generation_type: str = "summary",
    ) -> SummaryResult:
        last_error: Exception | None = None

        for attempt in range(1, self.settings.max_attempts + 1):
            try:
                client = self._build_client()
                config_kwargs = {
                    "temperature": 0.2,
                    "max_output_tokens": max_output_tokens,
                }
                if thinking_budget is not None:
                    config_kwargs["thinking_config"] = types.ThinkingConfig(
                        thinking_budget=thinking_budget,
                    )

                response = client.models.generate_content(
                    model=self.settings.model_name,
                    contents=prompt,
                    config=types.GenerateContentConfig(**config_kwargs),
                )

                summary = getattr(response, "text", None) or ""
                self._log_generation_diagnostics(
                    generation_type=generation_type,
                    prompt=prompt,
                    response=response,
                    output_text=summary,
                    max_output_tokens=max_output_tokens,
                    thinking_budget=thinking_budget,
                )
                if not summary.strip():
                    return SummaryResult(
                        success=False,
                        error="Gemini returned an empty summary.",
                        error_type="empty_response",
                        status_code=502,
                    )

                return SummaryResult(success=True, summary=summary.strip())
            except Exception as exc:
                last_error = exc
                if not self._is_transient_exception(exc) or attempt == self.settings.max_attempts:
                    logger.exception(
                        "Gemini API request failed",
                        extra={
                            "model": self.settings.model_name,
                            "error_type": type(exc).__name__,
                        },
                    )
                    error_type = "timeout_error" if isinstance(exc, (TimeoutError, httpx.TimeoutException)) else "gemini_api_error"
                    status_code = 504 if error_type == "timeout_error" else 502
                    return SummaryResult(
                        success=False,
                        error="Gemini request failed.",
                        error_type=error_type,
                        status_code=status_code,
                    )

                sleep_seconds = 0.5 * attempt
                logger.warning(
                    "Retrying transient Gemini failure",
                    extra={
                        "model": self.settings.model_name,
                        "attempt": attempt,
                        "error_type": type(exc).__name__,
                    },
                )
                time.sleep(sleep_seconds)

        logger.exception(
            "Gemini API request failed after retries",
            extra={
                "model": self.settings.model_name,
                "error_type": type(last_error).__name__ if last_error else "unknown",
            },
        )
        return SummaryResult(
            success=False,
            error="Gemini request failed.",
            error_type="gemini_api_error",
            status_code=502,
        )

    def _log_generation_diagnostics(
        self,
        generation_type: str,
        prompt: str,
        response,
        output_text: str,
        max_output_tokens: int,
        thinking_budget: int | None,
    ) -> None:
        candidate = (getattr(response, "candidates", None) or [None])[0]
        usage = getattr(response, "usage_metadata", None)
        logger.info(
            "Gemini %s generation diagnostics: prompt_chars=%s output_chars=%s max_output_tokens=%s thinking_budget=%s finish_reason=%s prompt_tokens=%s candidate_tokens=%s thoughts_tokens=%s total_tokens=%s",
            generation_type,
            len(prompt),
            len(output_text),
            max_output_tokens,
            thinking_budget,
            getattr(candidate, "finish_reason", None),
            getattr(usage, "prompt_token_count", None),
            getattr(usage, "candidates_token_count", None),
            getattr(usage, "thoughts_token_count", None),
            getattr(usage, "total_token_count", None),
        )
        logger.debug("Gemini %s prompt:\n%s", generation_type, prompt)
        logger.debug("Gemini %s raw text:\n%s", generation_type, output_text)

    def _call_answer_model(self, prompt: str, max_output_tokens: int = 3000) -> AnswerResult:
        text_result = self._call_gemini(
            prompt,
            max_output_tokens=max_output_tokens,
            thinking_budget=0,
            generation_type="chat",
        )
        if not text_result.success:
            return AnswerResult(
                success=False,
                error=text_result.error,
                error_type=text_result.error_type,
                status_code=text_result.status_code,
            )

        return AnswerResult(
            success=True,
            answer=text_result.summary,
        )

    def generate_embedding(
        self,
        text: str,
        title: str | None = None,
        task_type: str = "retrieval_document",
    ) -> EmbeddingResult:
        if not text or not text.strip():
            return EmbeddingResult(
                success=False,
                error="Text for embedding is empty.",
                error_type="validation_error",
                status_code=400,
            )

        config_status = self.configuration_status()
        if not config_status.success:
            return EmbeddingResult(
                success=False,
                error=config_status.error,
                error_type=config_status.error_type,
                status_code=config_status.status_code,
            )

        last_error: Exception | None = None
        for attempt in range(1, self.settings.max_attempts + 1):
            try:
                client = self._build_client()
                response = client.models.embed_content(
                    model=self.settings.embedding_model_name,
                    contents=text,
                    config=types.EmbedContentConfig(
                        taskType=task_type,
                        title=title,
                    ),
                )

                embedding = self._extract_embedding_values(response)
                if not embedding:
                    return EmbeddingResult(
                        success=False,
                        error="Gemini returned an empty embedding.",
                        error_type="empty_response",
                        status_code=502,
                    )

                return EmbeddingResult(success=True, embedding=embedding)
            except Exception as exc:
                last_error = exc
                if not self._is_transient_exception(exc) or attempt == self.settings.max_attempts:
                    logger.exception(
                        "Gemini embedding request failed",
                        extra={
                            "model": self.settings.embedding_model_name,
                            "error_type": type(exc).__name__,
                        },
                    )
                    error_type = "timeout_error" if isinstance(exc, (TimeoutError, httpx.TimeoutException)) else "gemini_api_error"
                    status_code = 504 if error_type == "timeout_error" else 502
                    return EmbeddingResult(
                        success=False,
                        error="Gemini embedding request failed.",
                        error_type=error_type,
                        status_code=status_code,
                    )

                logger.warning(
                    "Retrying transient Gemini embedding failure",
                    extra={
                        "model": self.settings.embedding_model_name,
                        "attempt": attempt,
                        "error_type": type(exc).__name__,
                    },
                )
                time.sleep(0.5 * attempt)

        logger.exception(
            "Gemini embedding request failed after retries",
            extra={
                "model": self.settings.embedding_model_name,
                "error_type": type(last_error).__name__ if last_error else "unknown",
            },
        )
        return EmbeddingResult(
            success=False,
            error="Gemini embedding request failed.",
            error_type="gemini_api_error",
            status_code=502,
        )

    def generate_answer(self, prompt: str, max_output_tokens: int = 800) -> AnswerResult:
        if not prompt or not prompt.strip():
            return AnswerResult(
                success=False,
                error="Prompt is empty.",
                error_type="validation_error",
                status_code=400,
            )

        config_status = self.configuration_status()
        if not config_status.success:
            return AnswerResult(
                success=False,
                error=config_status.error,
                error_type=config_status.error_type,
                status_code=config_status.status_code,
            )

        return self._call_answer_model(prompt, max_output_tokens=max_output_tokens)

    def generate_summary(self, extracted_text: str, document_title: str) -> SummaryResult:
        if not extracted_text or not extracted_text.strip():
            return SummaryResult(
                success=False,
                error="Extracted text is empty.",
                error_type="validation_error",
                status_code=400,
            )

        config_status = self.configuration_status()
        if not config_status.success:
            return config_status

        chunks = self._split_text(extracted_text)

        if len(chunks) == 1:
            return self._call_gemini(
                self._build_prompt(chunks[0], document_title)
            )

        partial_summaries: list[str] = []
        for index, chunk in enumerate(chunks, start=1):
            chunk_result = self._call_gemini(
                f"Document title: {document_title}\nChunk {index} of {len(chunks)}\n\n{self._build_prompt(chunk, document_title)}",
                max_output_tokens=1200,
            )

            if not chunk_result.success or not chunk_result.summary:
                return chunk_result

            partial_summaries.append(chunk_result.summary)

        return self._call_gemini(
            self._build_merge_prompt(partial_summaries, document_title),
            max_output_tokens=2000,
        )

    def answer_from_context(
        self,
        question: str,
        document_title: str,
        context_blocks: list[dict],
    ) -> AnswerResult:
        if not question or not question.strip():
            return AnswerResult(
                success=False,
                error="Question is empty.",
                error_type="validation_error",
                status_code=400,
            )

        if not context_blocks:
            return AnswerResult(
                success=True,
                answer="I couldn't find this information in the uploaded document.",
            )

        prompt = self._build_rag_prompt(question, document_title, context_blocks)
        result = self.generate_answer(prompt, max_output_tokens=3000)
        if result.success and result.answer:
            return result

        return AnswerResult(
            success=True,
            answer="I couldn't find this information in the uploaded document.",
        )


gemini_summary_service = GeminiSummaryService()
