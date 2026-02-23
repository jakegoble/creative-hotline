"""Tests for transcript processing utility."""

from app.utils.transcript_processor import (
    TranscriptSummary,
    parse_transcript_response,
    estimate_call_duration,
    count_words,
    format_summary_for_display,
)


# ── Fixtures ──────────────────────────────────────────────────────

VALID_JSON = """{
    "key_themes": ["brand positioning", "content calendar", "audience targeting"],
    "decisions_made": ["Focus on Instagram Reels over TikTok"],
    "recommendations_given": ["Create a 30-day content calendar using Notion"],
    "action_items_discussed": ["Set up Notion content board", "Film 3 test Reels"],
    "client_concerns": ["Not enough time to post consistently"],
    "notable_quotes": ["I feel like I am shouting into the void"],
    "word_count": 6500
}"""

VALID_JSON_WITH_FENCES = """```json
{
    "key_themes": ["brand positioning"],
    "decisions_made": [],
    "recommendations_given": [],
    "action_items_discussed": [],
    "client_concerns": [],
    "notable_quotes": [],
    "word_count": 1000
}
```"""

PARTIAL_JSON = '{"key_themes": ["one theme"], "word_count": 500}'

INVALID_JSON = "This is not JSON at all"


# ── Parsing ──────────────────────────────────────────────────────

def test_parse_valid_json():
    summary = parse_transcript_response(VALID_JSON)
    assert isinstance(summary, TranscriptSummary)
    assert len(summary.key_themes) == 3
    assert summary.key_themes[0] == "brand positioning"
    assert len(summary.action_items_discussed) == 2
    assert summary.word_count == 6500


def test_parse_json_with_code_fences():
    summary = parse_transcript_response(VALID_JSON_WITH_FENCES)
    assert len(summary.key_themes) == 1
    assert summary.key_themes[0] == "brand positioning"
    assert summary.word_count == 1000


def test_parse_partial_json():
    summary = parse_transcript_response(PARTIAL_JSON)
    assert len(summary.key_themes) == 1
    assert summary.decisions_made == []
    assert summary.recommendations_given == []
    assert summary.word_count == 500


def test_parse_invalid_json():
    summary = parse_transcript_response(INVALID_JSON)
    assert isinstance(summary, TranscriptSummary)
    assert summary.key_themes == []
    assert summary.word_count == 0


def test_parse_empty_string():
    summary = parse_transcript_response("")
    assert isinstance(summary, TranscriptSummary)
    assert summary.key_themes == []


# ── Duration Estimate ────────────────────────────────────────────

def test_estimate_call_duration_typical():
    # 45 min call at ~130 wpm ≈ 5850 words
    assert estimate_call_duration(5850) == 45


def test_estimate_call_duration_short():
    assert estimate_call_duration(650) == 5


def test_estimate_call_duration_zero():
    assert estimate_call_duration(0) == 0


def test_estimate_call_duration_negative():
    assert estimate_call_duration(-100) == 0


def test_estimate_call_duration_minimum():
    # Very short transcript should return at least 1 minute
    assert estimate_call_duration(50) == 1


# ── Word Count ───────────────────────────────────────────────────

def test_count_words():
    assert count_words("Hello world this is a test") == 6


def test_count_words_empty():
    assert count_words("") == 0


def test_count_words_multiline():
    assert count_words("line one\nline two\nline three") == 6


# ── Display Format ───────────────────────────────────────────────

def test_format_summary_excludes_empty():
    summary = TranscriptSummary(
        key_themes=["theme1"],
        decisions_made=[],
        recommendations_given=["rec1"],
    )
    sections = format_summary_for_display(summary)
    assert "Key Themes" in sections
    assert "Recommendations Given" in sections
    assert "Decisions Made" not in sections


def test_format_summary_all_empty():
    summary = TranscriptSummary()
    sections = format_summary_for_display(summary)
    assert sections == {}


# ── Dataclass ────────────────────────────────────────────────────

def test_transcript_summary_as_dict():
    summary = TranscriptSummary(
        key_themes=["a"],
        decisions_made=["b"],
        word_count=100,
    )
    d = summary.as_dict()
    assert d["key_themes"] == ["a"]
    assert d["word_count"] == 100
    assert d["decisions_made"] == ["b"]
    assert d["client_concerns"] == []


def test_transcript_summary_defaults():
    summary = TranscriptSummary()
    assert summary.key_themes == []
    assert summary.word_count == 0
    d = summary.as_dict()
    assert all(d[k] == [] for k in d if k != "word_count")
