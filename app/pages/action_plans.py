"""AI Action Plan Generator — Frankie-voiced plans with PDF export."""

import streamlit as st

from app.utils.exporters import generate_action_plan_pdf, save_action_plan_version
from app.utils.formatters import format_currency


def render():
    st.header("Action Plan Generator")

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

    # Only show clients with intake data and in appropriate pipeline stage
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
        # Show all clients as fallback
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
    intake = client["intake"]

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

    # Creative emergency
    if intake.get("creative_emergency"):
        with st.expander("Creative Emergency", expanded=True):
            st.write(intake["creative_emergency"])

    # Desired outcomes
    outcomes = intake.get("desired_outcome", [])
    if outcomes:
        st.markdown(f"**Desired Outcomes:** {', '.join(outcomes)}")

    # AI intake summary
    if intake.get("ai_summary"):
        with st.expander("AI Intake Summary"):
            st.info(intake["ai_summary"])

    st.divider()

    # ── Call Notes Input ──────────────────────────────────────────

    st.subheader("Call Notes")
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
    )

    # ── Generate Action Plan ──────────────────────────────────────

    st.divider()

    # Check for existing generated plan in session state
    plan_key = f"action_plan_{payment.get('email', '')}"

    if st.button("Generate Action Plan", type="primary", use_container_width=True):
        if not call_notes.strip():
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

    # ── Display Generated Plan ────────────────────────────────────

    if plan_key in st.session_state:
        plan_text = st.session_state[plan_key]

        st.subheader("Generated Action Plan")
        st.markdown(plan_text)

        st.divider()

        # ── Export Options ────────────────────────────────────────

        col_pdf, col_save, col_mark = st.columns(3)

        with col_pdf:
            try:
                pdf_bytes = generate_action_plan_pdf(
                    client_name=payment.get("client_name", "Client"),
                    product_purchased=payment.get("product_purchased", ""),
                    action_plan_markdown=plan_text,
                )
                client_name_safe = (
                    payment.get("client_name", "client")
                    .replace(" ", "-").lower()
                )
                st.download_button(
                    "Download PDF",
                    data=pdf_bytes,
                    file_name=f"action-plan-{client_name_safe}.pdf",
                    mime="application/pdf",
                    use_container_width=True,
                )
            except Exception as e:
                st.error(f"PDF generation failed: {e}")

        with col_save:
            if st.button("Save Version", use_container_width=True):
                email = payment.get("email", "unknown")
                filepath = save_action_plan_version(email, plan_text)
                st.success(f"Saved to {filepath}")

        with col_mark:
            already_sent = intake.get("action_plan_sent", False)
            label = "Already Sent" if already_sent else "Mark as Sent"

            if st.button(
                label,
                use_container_width=True,
                disabled=already_sent,
            ):
                try:
                    notion.update_page(
                        intake["id"],
                        {"Action Plan Sent": {"checkbox": True}},
                    )
                    st.success("Marked as sent in Notion.")
                    st.rerun()
                except Exception as e:
                    st.error(f"Failed to update Notion: {e}")

        # ── Edit Plan ─────────────────────────────────────────────

        with st.expander("Edit Plan"):
            edited = st.text_area(
                "Edit the action plan text",
                value=plan_text,
                height=400,
                label_visibility="collapsed",
            )
            if st.button("Save Edits"):
                st.session_state[plan_key] = edited
                st.rerun()
