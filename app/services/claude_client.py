"""Claude API client — action plan generation and ICP analysis."""

import logging

import anthropic

from app.utils.frankie_prompts import (
    ACTION_PLAN_SYSTEM_PROMPT,
    ICP_ANALYSIS_SYSTEM_PROMPT,
    build_action_plan_prompt,
    build_icp_prompt,
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
