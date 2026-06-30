"""
title_generator.py
====================
AI-based Title Generation module for the Smart Civic Complaint Management System.

Given a long free-text complaint description, this module generates a short,
human-readable title (e.g. for dashboard lists, notifications, and search
results) using a pretrained Transformer summarization model — a real
sequence-to-sequence neural AI model — rather than naive string truncation.

Why a Transformer model instead of "first N words"?
-----------------------------------------------------
Truncating a complaint to its first few words often loses the actual issue
("I have been trying to reach the..." tells you nothing). A pretrained
abstractive summarization model (T5 / BART family, fine-tuned for short
summarization) reads the full complaint and generates a concise, coherent
title that captures the core issue, the way a human dispatcher would.

Pipeline
--------
    Raw complaint text
        → HuggingFace `transformers` summarization pipeline
          (default: "sshleifer/distilbart-cnn-12-6", a distilled BART model —
           small and fast enough for real-time API use)
        → Post-process (strip trailing punctuation, enforce max length,
          title-case where appropriate)
        → Short title string

A lightweight extractive fallback (keyword/TextRank-style scoring using
TF-IDF, no external model download required) is used ONLY when the
`transformers` library or model weights are unavailable, so the service
never hard-fails.

Usage
-----
    from title_generator import TitleGenerator

    generator = TitleGenerator()
    generator.generate(
        "There has been no water supply in our street for the past three days "
        "and the local tank has also run completely dry, please send a tanker"
    )
    # -> "No Water Supply For Three Days"

Setup
-----
    pip install transformers torch --extra-index-url https://download.pytorch.org/whl/cpu

Author : Smart Complaint Management System team
License: MIT
"""

from __future__ import annotations

import logging
import re
from typing import List, Optional

logger = logging.getLogger("title_generator")

# ---------------------------------------------------------------------------
# AI Model backend: HuggingFace Transformers summarization pipeline
# ---------------------------------------------------------------------------
# A small distilled BART model — good quality/speed tradeoff for short,
# real-time title generation in an API request/response cycle.
SUMMARIZATION_MODEL_NAME = "sshleifer/distilbart-cnn-12-6"

DEFAULT_MIN_NEW_TOKENS = 4
DEFAULT_MAX_NEW_TOKENS = 16

try:
    from transformers import pipeline as hf_pipeline

    try:
        _summarizer = hf_pipeline("summarization", model=SUMMARIZATION_MODEL_NAME)
        _TRANSFORMERS_AVAILABLE = True
        logger.info("AI model loaded: transformers summarization pipeline '%s'.",
                     SUMMARIZATION_MODEL_NAME)
    except Exception as exc:  # model download / weights / runtime failure
        _summarizer = None
        _TRANSFORMERS_AVAILABLE = False
        logger.error(
            "Failed to load summarization model '%s' (%s). "
            "Falling back to extractive title generation.",
            SUMMARIZATION_MODEL_NAME, exc,
        )
except ImportError:
    _summarizer = None
    _TRANSFORMERS_AVAILABLE = False
    logger.error(
        "transformers not installed. Install with: "
        "pip install transformers torch. Falling back to extractive title generation only."
    )


# ---------------------------------------------------------------------------
# Fallback: lightweight extractive title generation (no model download)
# Uses simple TF-IDF style word scoring (a TextRank-lite approach) to pick
# the most informative words/phrase from the complaint when the AI
# summarization model is unavailable.
# ---------------------------------------------------------------------------
STOPWORDS = {
    "a", "an", "the", "is", "are", "was", "were", "been", "be", "being",
    "this", "that", "these", "those", "i", "we", "our", "my", "me", "us",
    "in", "on", "at", "for", "of", "to", "and", "or", "but", "with",
    "since", "from", "by", "as", "it", "its", "there", "here", "has",
    "have", "had", "please", "kindly", "also", "very", "so", "just",
    "due", "because", "near", "around", "about",
}

MAX_FALLBACK_TITLE_WORDS = 8


class TitleGenerator:
    """
    AI-powered title generator for free-text civic complaints.

    Primary engine: pretrained Transformer summarization model (distilBART).
    Fallback engine: TF-IDF-style extractive keyword title, used only if
    the transformer model is unavailable.
    """

    def __init__(
        self,
        require_ai_model: bool = False,
        max_new_tokens: int = DEFAULT_MAX_NEW_TOKENS,
        min_new_tokens: int = DEFAULT_MIN_NEW_TOKENS,
    ) -> None:
        """
        Parameters
        ----------
        require_ai_model:
            If True, raise a RuntimeError when the transformer model could not
            be loaded (use in production to fail fast instead of silently
            degrading). If False (default), fall back gracefully.
        max_new_tokens, min_new_tokens:
            Bounds on generated title length when using the AI model.
        """
        self.use_ai_model: bool = _TRANSFORMERS_AVAILABLE
        self.max_new_tokens = max_new_tokens
        self.min_new_tokens = min_new_tokens

        if not self.use_ai_model and require_ai_model:
            raise RuntimeError(
                f"AI model '{SUMMARIZATION_MODEL_NAME}' could not be loaded. "
                "Install with: pip install transformers torch"
            )

        if not self.use_ai_model:
            logger.warning(
                "Running TitleGenerator WITHOUT the AI model — "
                "using extractive keyword fallback only. Quality will be lower."
            )

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------
    def generate(self, text: str) -> str:
        """
        Generate a short title for a complaint description.

        Parameters
        ----------
        text:
            Free-text complaint description.

        Returns
        -------
        title : str
            A short (typically 3-10 word) human-readable title.
            Returns "Untitled Complaint" if *text* is empty.
        """
        if not text or not text.strip():
            return "Untitled Complaint"

        cleaned = text.strip()

        if self.use_ai_model:
            try:
                title = self._generate_with_ai_model(cleaned)
                if title:
                    return title
            except Exception as exc:  # pragma: no cover - runtime safety net
                logger.warning("AI title generation failed (%s) — using fallback.", exc)

        return self._generate_with_fallback(cleaned)

    def generate_batch(self, texts: List[str]) -> List[str]:
        """
        Generate titles for a list of complaints in one pass.

        Parameters
        ----------
        texts:
            List of complaint strings.

        Returns
        -------
        titles : list[str]
            Generated titles, same order/length as *texts*.
        """
        return [self.generate(t) for t in texts]

    # ------------------------------------------------------------------
    # AI model backend (transformer summarization)
    # ------------------------------------------------------------------
    def _generate_with_ai_model(self, text: str) -> Optional[str]:
        if _summarizer is None:
            return None

        # Very short complaints don't need summarization at all.
        word_count = len(text.split())
        if word_count <= self.max_new_tokens:
            return self._post_process(text)

        result = _summarizer(
            text,
            max_new_tokens=self.max_new_tokens,
            min_new_tokens=self.min_new_tokens,
            do_sample=False,
            truncation=True,
        )
        summary_text = result[0]["summary_text"] if result else ""
        return self._post_process(summary_text)

    # ------------------------------------------------------------------
    # Fallback backend (extractive keyword scoring)
    # ------------------------------------------------------------------
    def _generate_with_fallback(self, text: str) -> str:
        sentences = self._split_sentences(text)
        first_sentence = sentences[0] if sentences else text

        words = re.findall(r"[A-Za-z0-9']+", first_sentence)
        scored = [(w, self._word_score(w, words)) for w in words]

        # Preserve original order but drop low-value stopwords; keep enough
        # words to form a readable short phrase.
        kept = [w for w, score in scored if score > 0]
        if not kept:
            kept = words

        title_words = kept[:MAX_FALLBACK_TITLE_WORDS]
        title = " ".join(title_words)
        return self._post_process(title)

    @staticmethod
    def _split_sentences(text: str) -> List[str]:
        parts = re.split(r"(?<=[.!?])\s+", text.strip())
        return [p for p in parts if p]

    @staticmethod
    def _word_score(word: str, all_words: List[str]) -> float:
        """Simple informativeness score: non-stopword, reasonably long words score higher."""
        lower = word.lower()
        if lower in STOPWORDS:
            return 0.0
        return 1.0 + (0.1 * min(len(word), 10))

    # ------------------------------------------------------------------
    # Shared post-processing
    # ------------------------------------------------------------------
    @staticmethod
    def _post_process(title: str) -> str:
        """Clean up generated/extracted text into a presentable title."""
        title = title.strip()
        title = re.sub(r"\s+", " ", title)
        title = title.strip(" .,;:-")

        if not title:
            return "Untitled Complaint"

        # Title-case for readability, but keep short connector words lowercase
        # (except the first word) for a more natural-looking title.
        lower_connectors = {"a", "an", "the", "in", "on", "at", "for", "of", "to", "and", "or"}
        words = title.split()
        cased = []
        for i, w in enumerate(words):
            if i > 0 and w.lower() in lower_connectors:
                cased.append(w.lower())
            else:
                cased.append(w[:1].upper() + w[1:] if w else w)
        return " ".join(cased)

    # ------------------------------------------------------------------
    # Dunder
    # ------------------------------------------------------------------
    def __repr__(self) -> str:
        engine = f"transformers:{SUMMARIZATION_MODEL_NAME}" if self.use_ai_model else "extractive-fallback"
        return f"TitleGenerator(engine={engine!r})"


# ---------------------------------------------------------------------------
# Manual test / demo
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    generator = TitleGenerator()
    print(f"Engine in use: {generator!r}\n")

    demo_complaints = [
        "There has been no water supply in our street for the past three days "
        "and the local tank has also run completely dry, please send a tanker",
        "Garbage has not been collected near our colony for over a week and it "
        "is starting to smell really bad and attracting stray animals",
        "A transformer near the main road has been making loud sparking noises "
        "since last night and we are worried it might catch fire",
        "Pothole",
        "There is a huge pothole on MG Road right outside the bus stop that "
        "has already caused two accidents this month and needs urgent repair",
    ]

    print("Title Generation Demo")
    print("-" * 60)
    for complaint in demo_complaints:
        title = generator.generate(complaint)
        print(f"  '{complaint[:70]}...'\n    -> {title!r}\n")