"""Claude API client — action plan generation and ICP analysis."""

from __future__ import annotations

import logging

import anthropic

from app.utils.frankie_prompts import (
    ACTION_PLAN_SYSTEM_PROMPT,
    ICP_ANALYSIS_SYSTEM_PROMPT,
    INTAKE_ANALYSIS_PROMPT,
    UPSELL_DETECTION_PROMPT,
    PRE_CALL_BRIEFING_PROMPT,
    REVENUE_STRATEGY_PROMPT,
    SPRINT_ROADMAP_PROMPT,
    TESTIMONIAL_GENERATION_PROMPT,
    CASE_STUDY_PROMPT,
    TRANSCRIPT_PROCESSING_PROMPT,
    build_action_plan_prompt,
    build_icp_prompt,
    build_intake_analysis_prompt,
    build_upsell_detection_prompt,
    build_pre_call_briefing_prompt,
    build_sprint_roadmap_prompt,
    build_testimonial_prompt,
    build_case_study_prompt,
    build_growth_analysis_prompt,
    build_transcript_processing_prompt,
    build_action_plan_from_transcript_prompt,
)

logger = logging.getLogger(__name__)


class ClaudeService:
    def __init__(self, api_key: str, model: str = "claude-sonnet-4-5-20250929"):
        self._client = anthropic.Anthropic(api_key=api_key)
        self._model = model

    def is_healthy(self) -> bool:
        """Check if Claude API key is valid without burning tokens."""
        try:
            self._client.models.list(limit=1)
            return True
        except Exception:
            return False

    def generate_action_plan(
        self,
        client_name: str,
        brand: str,
        role: str,
        creative_emergency: str,
        desired_outcome: str,
        what_tried: str,
        deadline: str,
        constraints: str,
        ai_summary: str,
        call_notes: str,
        product_purchased: str,
        payment_amount: float,
    ) -> str:
        """Generate a Frankie-voiced action plan for a client.

        Returns the action plan as Markdown text.
        """
        user_message = build_action_plan_prompt(
            client_name=client_name,
            brand=brand,
            role=role,
            creative_emergency=creative_emergency,
            desired_outcome=desired_outcome,
            what_tried=what_tried,
            deadline=deadline,
            constraints=constraints,
            ai_summary=ai_summary,
            call_notes=call_notes,
            product_purchased=product_purchased,
            payment_amount=payment_amount,
        )

        try:
            response = self._client.messages.create(
                model=self._model,
                max_tokens=2048,
                system=ACTION_PLAN_SYSTEM_PROMPT,
                messages=[{"role": "user", "content": user_message}],
            )
            return response.content[0].text
        except Exception as e:
            logger.error(f"Claude action plan generation failed: {e}")
            return f"Error generating action plan: {e}"

    def process_transcript(self, raw_transcript: str) -> str:
        """Send a call transcript to Claude for structured extraction.

        Returns raw JSON string that TranscriptProcessor parses.
        """
        user_message = build_transcript_processing_prompt(raw_transcript)

        try:
            response = self._client.messages.create(
                model=self._model,
                max_tokens=4096,
                system=TRANSCRIPT_PROCESSING_PROMPT,
                messages=[{"role": "user", "content": user_message}],
            )
            return response.content[0].text
        except Exception as e:
            logger.error(f"Claude transcript processing failed: {e}")
            return f"Error processing transcript: {e}"

    def generate_action_plan_from_transcript(
        self,
        client_name: str,
        brand: str,
        role: str,
        creative_emergency: str,
        desired_outcome: str,
        what_tried: str,
        deadline: str,
        constraints: str,
        ai_summary: str,
        transcript_summary: dict,
        product_purchased: str,
        payment_amount: float,
    ) -> str:
        """Generate a Frankie-voiced action plan using transcript analysis."""
        user_message = build_action_plan_from_transcript_prompt(
            client_name=client_name,
            brand=brand,
            role=role,
            creative_emergency=creative_emergency,
            desired_outcome=desired_outcome,
            what_tried=what_tried,
            deadline=deadline,
            constraints=constraints,
            ai_summary=ai_summary,
            transcript_summary=transcript_summary,
            product_purchased=product_purchased,
            payment_amount=payment_amount,
        )

        try:
            response = self._client.messages.create(
                model=self._model,
                max_tokens=2048,
                system=ACTION_PLAN_SYSTEM_PROMPT,
                messages=[{"role": "user", "content": user_message}],
            )
            return response.content[0].text
        except Exception as e:
            logger.error(f"Claude action plan (transcript) generation failed: {e}")
            return f"Error generating action plan: {e}"

    def analyze_intake(
        self,
        client_name: str,
        brand: str,
        role: str,
        creative_emergency: str,
        desired_outcome: str,
        what_tried: str,
        deadline: str,
        constraints: str,
    ) -> str:
        """Analyze a client's intake form for call prep.

        Returns internal briefing text (not client-facing).
        """
        user_message = build_intake_analysis_prompt(
            client_name=client_name,
            brand=brand,
            role=role,
            creative_emergency=creative_emergency,
            desired_outcome=desired_outcome,
            what_tried=what_tried,
            deadline=deadline,
            constraints=constraints,
        )
        try:
            response = self._client.messages.create(
                model=self._model,
                max_tokens=800,
                system=INTAKE_ANALYSIS_PROMPT,
                messages=[{"role": "user", "content": user_message}],
            )
            return response.content[0].text
        except Exception as e:
            logger.error(f"Claude intake analysis failed: {e}")
            return f"Error analyzing intake: {e}"

    def detect_upsell(
        self,
        client_name: str,
        creative_emergency: str,
        desired_outcome: str,
        what_tried: str,
        deadline: str,
        constraints: str,
    ) -> str:
        """Detect upsell potential from intake data.

        Returns JSON string with upsell_recommended, confidence, reasons.
        """
        user_message = build_upsell_detection_prompt(
            client_name=client_name,
            creative_emergency=creative_emergency,
            desired_outcome=desired_outcome,
            what_tried=what_tried,
            deadline=deadline,
            constraints=constraints,
        )
        try:
            response = self._client.messages.create(
                model=self._model,
                max_tokens=500,
                system=UPSELL_DETECTION_PROMPT,
                messages=[{"role": "user", "content": user_message}],
            )
            return response.content[0].text
        except Exception as e:
            logger.error(f"Claude upsell detection failed: {e}")
            return f"Error detecting upsell: {e}"

    def generate_pre_call_briefing(
        self,
        client_name: str,
        brand: str,
        role: str,
        creative_emergency: str,
        desired_outcome: str,
        what_tried: str,
        deadline: str,
        constraints: str,
        ai_summary: str,
        call_date: str,
    ) -> str:
        """Generate a pre-call briefing for Jake/Megha.

        Returns internal briefing text (not client-facing).
        """
        user_message = build_pre_call_briefing_prompt(
            client_name=client_name,
            brand=brand,
            role=role,
            creative_emergency=creative_emergency,
            desired_outcome=desired_outcome,
            what_tried=what_tried,
            deadline=deadline,
            constraints=constraints,
            ai_summary=ai_summary,
            call_date=call_date,
        )
        try:
            response = self._client.messages.create(
                model=self._model,
                max_tokens=500,
                system=PRE_CALL_BRIEFING_PROMPT,
                messages=[{"role": "user", "content": user_message}],
            )
            return response.content[0].text
        except Exception as e:
            logger.error(f"Claude pre-call briefing failed: {e}")
            return f"Error generating briefing: {e}"

    def generate_text(self, prompt: str, max_tokens: int = 1500) -> str:
        """Generic text generation with a simple prompt.

        Used by channel analysis, win-back strategy, and other features
        that need Frankie-voiced responses without specific system prompts.
        """
        try:
            response = self._client.messages.create(
                model=self._model,
                max_tokens=max_tokens,
                messages=[{"role": "user", "content": prompt}],
            )
            return response.content[0].text
        except Exception as e:
            logger.error(f"Claude text generation failed: {e}")
            return f"Error: {e}"

    def analyze_icp(self, clients: list[dict]) -> str:
        """Analyze all client data to generate Ideal Client Profile.

        Args:
            clients: list of merged client dicts with payment + intake data
        Returns:
            ICP analysis as Markdown text.
        """
        user_message = build_icp_prompt(clients)

        try:
            response = self._client.messages.create(
                model=self._model,
                max_tokens=1500,
                system=ICP_ANALYSIS_SYSTEM_PROMPT,
                messages=[{"role": "user", "content": user_message}],
            )
            return response.content[0].text
        except Exception as e:
            logger.error(f"Claude ICP analysis failed: {e}")
            return f"Error generating ICP analysis: {e}"

    def generate_testimonial(
        self,
        client_name: str,
        brand: str,
        creative_emergency: str,
        outcome_text: str,
        product_purchased: str,
    ) -> str:
        """Generate a client testimonial from outcome data."""
        user_message = build_testimonial_prompt(
            client_name=client_name,
            brand=brand,
            creative_emergency=creative_emergency,
            outcome_text=outcome_text,
            product_purchased=product_purchased,
        )
        try:
            response = self._client.messages.create(
                model=self._model,
                max_tokens=500,
                system=TESTIMONIAL_GENERATION_PROMPT,
                messages=[{"role": "user", "content": user_message}],
            )
            return response.content[0].text
        except Exception as e:
            logger.error(f"Claude testimonial generation failed: {e}")
            return f"Error: {e}"

    def generate_case_study(
        self,
        client_name: str,
        brand: str,
        role: str,
        creative_emergency: str,
        action_plan_summary: str,
        outcome_text: str,
        product_purchased: str,
    ) -> str:
        """Generate a case study from full client journey data."""
        user_message = build_case_study_prompt(
            client_name=client_name,
            brand=brand,
            role=role,
            creative_emergency=creative_emergency,
            action_plan_summary=action_plan_summary,
            outcome_text=outcome_text,
            product_purchased=product_purchased,
        )
        try:
            response = self._client.messages.create(
                model=self._model,
                max_tokens=2048,
                system=CASE_STUDY_PROMPT,
                messages=[{"role": "user", "content": user_message}],
            )
            return response.content[0].text
        except Exception as e:
            logger.error(f"Claude case study generation failed: {e}")
            return f"Error: {e}"

    def generate_sprint_roadmap(
        self,
        client_name: str,
        brand: str,
        session_1_plan: str,
        session_2_plan: str,
        session_3_plan: str,
        key_themes: list[str] | None = None,
    ) -> str:
        """Generate a 90-day roadmap from all Sprint session plans."""
        user_message = build_sprint_roadmap_prompt(
            client_name=client_name,
            brand=brand,
            session_1_plan=session_1_plan,
            session_2_plan=session_2_plan,
            session_3_plan=session_3_plan,
            key_themes=key_themes,
        )
        try:
            response = self._client.messages.create(
                model=self._model,
                max_tokens=2048,
                system=SPRINT_ROADMAP_PROMPT,
                messages=[{"role": "user", "content": user_message}],
            )
            return response.content[0].text
        except Exception as e:
            logger.error(f"Claude sprint roadmap generation failed: {e}")
            return f"Error generating roadmap: {e}"

    def analyze_growth(self, metrics: dict) -> str:
        """Analyze growth metrics and recommend strategies."""
        user_message = build_growth_analysis_prompt(
            revenue_pace=metrics.get("pace", {}),
            goal=metrics.get("goal", 800_000),
            channel_data=metrics.get("channels", []),
            product_mix=metrics.get("product_mix", {}),
            upsell_rate_pct=metrics.get("upsell_rate", 0),
        )
        try:
            response = self._client.messages.create(
                model=self._model,
                max_tokens=1500,
                system=REVENUE_STRATEGY_PROMPT,
                messages=[{"role": "user", "content": user_message}],
            )
            return response.content[0].text
        except Exception as e:
            logger.error(f"Claude growth analysis failed: {e}")
            return f"Error: {e}"
