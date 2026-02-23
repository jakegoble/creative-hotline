"""Transcript processing — structured extraction from Fireflies AI transcripts."""

from __future__ import annotations

import json
import logging
import re
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)


@dataclass
class TranscriptSummary:
    """Structured summary extracted from a call transcript."""

    key_themes: list[str] = field(default_factory=list)
    decisions_made: list[str] = field(default_factory=list)
    recommendations_given: list[str] = field(default_factory=list)
    action_items_discussed: list[str] = field(default_factory=list)
    client_concerns: list[str] = field(default_factory=list)
    notable_quotes: list[str] = field(default_factory=list)
    word_count: int = 0

    def as_dict(self) -> dict:
        return {
            "key_themes": self.key_themes,
            "decisions_made": self.decisions_made,
            "recommendations_given": self.recommendations_given,
            "action_items_discussed": self.action_items_discussed,
            "client_concerns": self.client_concerns,
            "notable_quotes": self.notable_quotes,
            "word_count": self.word_count,
        }


def parse_transcript_response(json_str: str) -> TranscriptSummary:
    """Parse Claude's JSON response into a TranscriptSummary.

    Handles code fences, missing fields, and invalid JSON gracefully.
    """
    if not json_str or not json_str.strip():
        return TranscriptSummary()

    # Strip markdown code fences if present
    cleaned = json_str.strip()
    fence_match = re.search(r"```(?:json)?\s*\n?(.*?)\n?\s*```", cleaned, re.DOTALL)
    if fence_match:
        cleaned = fence_match.group(1).strip()

    try:
        data = json.loads(cleaned)
    except (json.JSONDecodeError, ValueError):
        logger.warning("Failed to parse transcript response as JSON")
        return TranscriptSummary()

    if not isinstance(data, dict):
        return TranscriptSummary()

    return TranscriptSummary(
        key_themes=data.get("key_themes", []),
        decisions_made=data.get("decisions_made", []),
        recommendations_given=data.get("recommendations_given", []),
        action_items_discussed=data.get("action_items_discussed", []),
        client_concerns=data.get("client_concerns", []),
        notable_quotes=data.get("notable_quotes", []),
        word_count=data.get("word_count", 0),
    )


def estimate_call_duration(word_count: int) -> int:
    """Estimate call duration in minutes from transcript word count.

    Uses ~130 words per minute (accounts for pauses and back-and-forth).
    """
    if word_count <= 0:
        return 0
    return max(1, round(word_count / 130))


def count_words(raw_transcript: str) -> int:
    """Count words in raw transcript text."""
    if not raw_transcript:
        return 0
    return len(raw_transcript.split())


def format_summary_for_display(summary: TranscriptSummary) -> dict[str, list[str]]:
    """Format transcript summary into labeled sections for UI display.

    Only includes non-empty sections.
    """
    sections = {
        "Key Themes": summary.key_themes,
        "Decisions Made": summary.decisions_made,
        "Recommendations Given": summary.recommendations_given,
        "Action Items Discussed": summary.action_items_discussed,
        "Client Concerns": summary.client_concerns,
        "Notable Quotes": summary.notable_quotes,
    }
    return {k: v for k, v in sections.items() if v}
