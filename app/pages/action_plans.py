"""Action Plan Studio — transcript processing, AI generation, premium delivery."""

from __future__ import annotations

from datetime import datetime

import streamlit as st

from app.utils.exporters import generate_premium_pdf, save_action_plan_version
from app.utils.formatters import format_currency
from app.utils.transcript_processor import (
    TranscriptSummary,
    parse_transcript_response,
    count_words,
    estimate_call_duration,
    format_summary_for_display,
)
from app.utils.plan_delivery import generate_client_html, save_client_page


def render():
    st.header("Action Plan Studio")

    notion = st.session_state.get("notion")
    claude = st.session_state.get("claude")

    if not notion:
        st.warning("Notion not connected. Add NOTION_API_KEY to .env.")
        return

    if not claude:
        st.warning("Claude not connected. Add ANTHROPIC_API_KEY to .env.")
        return

    merged = notion.get_merged_clients()
    if not merged:
        st.info("No client records found.")
        return

    # ── Client Selector ───────────────────────────────────────────

    eligible = [
        m for m in merged
        if m.get("intake")
        and m["payment"].get("status") in (
            "Intake Complete", "Ready for Call", "Call Complete",
        )
    ]

    if not eligible:
        st.info(
            "No clients ready for action plans. "
            "Clients need to be at 'Intake Complete' status or later."
        )
        with st.expander("Show all clients with intake data"):
            eligible = [m for m in merged if m.get("intake")]
            if not eligible:
                st.caption("No clients have submitted intake forms yet.")
                return

    client_options = {
        f"{m['payment'].get('client_name') or m['payment'].get('email', 'Unknown')} "
        f"— {m['payment'].get('status', '')}": m
        for m in eligible
    }

    selected_label = st.selectbox(
        "Select Client",
        options=list(client_options.keys()),
        help="Clients with completed intake forms are shown here.",
    )

    if not selected_label:
        return

    client = client_options[selected_label]
    payment = client["payment"]
    intake = client.get("intake") or {}

    # ── Client Brief ──────────────────────────────────────────────

    st.subheader("Client Brief")

    col1, col2 = st.columns(2)

    with col1:
        st.markdown(f"**Name:** {payment.get('client_name') or '—'}")
        st.markdown(f"**Email:** {payment.get('email') or '—'}")
        st.markdown(f"**Product:** {payment.get('product_purchased') or '—'}")
        st.markdown(f"**Amount:** {format_currency(payment.get('payment_amount', 0))}")

    with col2:
        st.markdown(f"**Role:** {intake.get('role') or '—'}")
        st.markdown(f"**Brand:** {intake.get('brand') or '—'}")
        st.markdown(f"**Deadline:** {intake.get('deadline') or '—'}")
        st.markdown(f"**Status:** {payment.get('status') or '—'}")

    if intake.get("creative_emergency"):
        with st.expander("Creative Emergency", expanded=True):
            st.write(intake["creative_emergency"])

    outcomes = intake.get("desired_outcome", [])
    if outcomes:
        st.markdown(f"**Desired Outcomes:** {', '.join(outcomes)}")

    if intake.get("ai_summary"):
        with st.expander("AI Intake Summary"):
            st.info(intake["ai_summary"])

    st.divider()

    # ── Input Tabs ────────────────────────────────────────────────

    email = payment.get("email", "")
    plan_key = f"action_plan_{email}"
    transcript_key = f"transcript_summary_{email}"

    tab_transcript, tab_manual = st.tabs(["Paste Transcript", "Manual Notes"])

    with tab_transcript:
        _render_transcript_tab(payment, intake, claude, plan_key, transcript_key)

    with tab_manual:
        _render_manual_tab(payment, intake, claude, plan_key)

    # ── Display Generated Plan ────────────────────────────────────

    if plan_key in st.session_state:
        _render_plan_display(plan_key, transcript_key, payment, intake)


def _render_transcript_tab(
    payment: dict, intake: dict, claude, plan_key: str, transcript_key: str,
) -> None:
    """Transcript processing tab — paste Fireflies transcript, extract, generate."""
    email = payment.get("email", "")

    st.caption(
        "Paste the full transcript from Fireflies AI. "
        "We'll extract key themes, decisions, and action items automatically."
    )

    raw_transcript = st.text_area(
        "Call transcript",
        height=250,
        placeholder="Paste the Fireflies AI transcript here...",
        label_visibility="collapsed",
        key=f"transcript_input_{email}",
    )

    # Process button + word count
    col_process, col_info = st.columns([2, 1])
    with col_process:
        process_btn = st.button(
            "Process Transcript",
            use_container_width=True,
            key=f"process_btn_{email}",
        )
    with col_info:
        if raw_transcript and raw_transcript.strip():
            wc = count_words(raw_transcript)
            duration = estimate_call_duration(wc)
            st.caption(f"{wc:,} words — ~{duration} min call")

    if process_btn:
        if not raw_transcript or not raw_transcript.strip():
            st.warning("Paste a transcript first.")
            return
        with st.spinner("Analyzing transcript..."):
            json_response = claude.process_transcript(raw_transcript)
        if json_response.startswith("Error"):
            st.error(json_response)
            return
        summary = parse_transcript_response(json_response)
        summary.word_count = count_words(raw_transcript)
        st.session_state[transcript_key] = summary
        st.rerun()

    # Display processed summary
    if transcript_key in st.session_state:
        summary = st.session_state[transcript_key]
        sections = format_summary_for_display(summary)

        st.success(
            f"Transcript processed — {len(summary.key_themes)} themes, "
            f"{len(summary.action_items_discussed)} action items extracted."
        )
        for section_name, items in sections.items():
            with st.expander(section_name):
                for item in items:
                    st.markdown(f"- {item}")

        # Generate action plan from transcript
        st.divider()
        if st.button(
            "Generate Action Plan",
            type="primary",
            use_container_width=True,
            key=f"gen_from_transcript_{email}",
        ):
            with st.spinner("Frankie is writing the action plan..."):
                plan = claude.generate_action_plan_from_transcript(
                    client_name=payment.get("client_name", ""),
                    brand=intake.get("brand", ""),
                    role=intake.get("role", ""),
                    creative_emergency=intake.get("creative_emergency", ""),
                    desired_outcome=", ".join(intake.get("desired_outcome", [])),
                    what_tried=intake.get("what_tried", ""),
                    deadline=intake.get("deadline", ""),
                    constraints=intake.get("constraints", ""),
                    ai_summary=intake.get("ai_summary", ""),
                    transcript_summary=summary.as_dict(),
                    product_purchased=payment.get("product_purchased", ""),
                    payment_amount=payment.get("payment_amount", 0),
                )
            if plan.startswith("Error"):
                st.error(plan)
                return
            st.session_state[plan_key] = plan
            st.rerun()


def _render_manual_tab(
    payment: dict, intake: dict, claude, plan_key: str,
) -> None:
    """Manual call notes tab — same as original flow."""
    email = payment.get("email", "")

    st.caption(
        "Enter notes from the call with this client. "
        "The more detail, the better the action plan."
    )

    call_notes = st.text_area(
        "Call notes",
        height=200,
        placeholder=(
            "What did you discuss on the call? Key decisions, "
            "breakthroughs, specific advice given, next steps discussed..."
        ),
        label_visibility="collapsed",
        key=f"manual_notes_{email}",
    )

    if st.button(
        "Generate Action Plan",
        type="primary",
        use_container_width=True,
        key=f"gen_from_manual_{email}",
    ):
        if not call_notes or not call_notes.strip():
            st.warning("Please enter call notes before generating.")
            return

        with st.spinner("Frankie is writing the action plan..."):
            plan = claude.generate_action_plan(
                client_name=payment.get("client_name", ""),
                brand=intake.get("brand", ""),
                role=intake.get("role", ""),
                creative_emergency=intake.get("creative_emergency", ""),
                desired_outcome=", ".join(intake.get("desired_outcome", [])),
                what_tried=intake.get("what_tried", ""),
                deadline=intake.get("deadline", ""),
                constraints=intake.get("constraints", ""),
                ai_summary=intake.get("ai_summary", ""),
                call_notes=call_notes,
                product_purchased=payment.get("product_purchased", ""),
                payment_amount=payment.get("payment_amount", 0),
            )

        if plan.startswith("Error"):
            st.error(plan)
            return

        st.session_state[plan_key] = plan
        st.rerun()


def _render_plan_display(
    plan_key: str, transcript_key: str, payment: dict, intake: dict,
) -> None:
    """Display generated action plan with export options."""
    plan_text = st.session_state[plan_key]
    transcript_summary = st.session_state.get(transcript_key)

    st.subheader("Generated Action Plan")
    st.markdown(plan_text)
    st.divider()

    # ── Export Options ────────────────────────────────────────────

    client_name = payment.get("client_name", "Client")
    client_name_safe = client_name.replace(" ", "-").lower()
    email = payment.get("email", "unknown")
    product = payment.get("product_purchased", "")
    brand = (intake or {}).get("brand", "")

    col_pdf, col_html, col_save = st.columns(3)

    with col_pdf:
        try:
            date_str = datetime.now().strftime("%B %d, %Y")
            summary_dict = transcript_summary.as_dict() if transcript_summary else None
            pdf_bytes = generate_premium_pdf(
                client_name=client_name,
                brand=brand,
                product=product,
                date=date_str,
                action_plan_markdown=plan_text,
                transcript_summary=summary_dict,
            )
            st.download_button(
                "Download Premium PDF",
                data=pdf_bytes,
                file_name=f"action-plan-{client_name_safe}.pdf",
                mime="application/pdf",
                use_container_width=True,
            )
        except Exception as e:
            st.error(f"PDF generation failed: {e}")

    with col_html:
        try:
            html_content = generate_client_html(
                client_name=client_name,
                brand=brand,
                product=product,
                action_plan_markdown=plan_text,
            )
            st.download_button(
                "Download Client Page",
                data=html_content,
                file_name=f"action-plan-{client_name_safe}.html",
                mime="text/html",
                use_container_width=True,
            )
        except Exception as e:
            st.error(f"HTML generation failed: {e}")

    with col_save:
        if st.button("Save Version", use_container_width=True, key="save_version"):
            filepath = save_action_plan_version(email, plan_text)
            st.success(f"Saved to {filepath}")

    # Mark as sent
    col_mark, _ = st.columns([1, 2])
    with col_mark:
        already_sent = (intake or {}).get("action_plan_sent", False)
        label = "Already Sent" if already_sent else "Mark as Sent"
        notion = st.session_state.get("notion")

        if st.button(
            label,
            use_container_width=True,
            disabled=already_sent,
            key="mark_sent",
        ):
            if intake and notion:
                try:
                    notion.update_page(
                        intake["id"],
                        {"Action Plan Sent": {"checkbox": True}},
                    )
                    st.success("Marked as sent in Notion.")
                    st.rerun()
                except Exception as e:
                    st.error(f"Failed to update Notion: {e}")

    # ── Edit Plan ─────────────────────────────────────────────────

    with st.expander("Edit Plan"):
        edited = st.text_area(
            "Edit the action plan text",
            value=plan_text,
            height=400,
            label_visibility="collapsed",
            key="edit_plan",
        )
        if st.button("Save Edits", key="save_edits"):
            st.session_state[plan_key] = edited
            st.rerun()
