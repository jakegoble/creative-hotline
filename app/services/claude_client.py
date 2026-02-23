"""Claude API client — action plan generation and ICP analysis."""

import logging

import anthropic

from app.utils.frankie_prompts import (
    ACTION_PLAN_SYSTEM_PROMPT,
    ICP_ANALYSIS_SYSTEM_PROMPT,
    REVENUE_STRATEGY_PROMPT,
    TESTIMONIAL_GENERATION_PROMPT,
    CASE_STUDY_PROMPT,
    GROWTH_RECOMMENDATION_PROMPT,
    build_action_plan_prompt,
    build_icp_prompt,
    build_testimonial_prompt,
    build_case_study_prompt,
    build_growth_analysis_prompt,
)

logger = logging.getLogger(__name__)


class ClaudeService:
    def __init__(self, api_key: str, model: str = "claude-sonnet-4-5-20250929"):
        self._client = anthropic.Anthropic(api_key=api_key)
        self._model = model

    def is_healthy(self) -> bool:
        """Check if Claude API is reachable."""
        try:
            # Minimal API call to verify key
            self._client.messages.create(
                model=self._model,
                max_tokens=10,
                messages=[{"role": "user", "content": "hi"}],
            )
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
