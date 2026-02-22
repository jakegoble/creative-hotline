"""Cohort analysis component — group clients by signup week and track progression."""

from datetime import datetime, timedelta

import pandas as pd

from app.config import PIPELINE_STATUSES


def build_cohort_data(payments: list[dict]) -> pd.DataFrame:
    """Build a cohort table from payment records.

    Groups clients by signup week and shows how many reached each pipeline stage.
    """
    if not payments:
        return pd.DataFrame()

    rows = []
    for p in payments:
        created = p.get("created", "")
        if not created:
            continue
        try:
            dt = datetime.fromisoformat(created.replace("Z", "+00:00"))
            week_start = dt - timedelta(days=dt.weekday())
            week_label = week_start.strftime("%b %d")
        except (ValueError, TypeError):
            continue

        status = p.get("status", "")
        status_index = PIPELINE_STATUSES.index(status) if status in PIPELINE_STATUSES else -1

        rows.append({
            "cohort_week": week_label,
            "week_start": week_start,
            "status": status,
            "status_index": status_index,
        })

    if not rows:
        return pd.DataFrame()

    df = pd.DataFrame(rows)

    # Build pivot: each row is a cohort week, each column is a pipeline stage
    # Value = count of records that reached AT LEAST that stage
    cohort_groups = df.groupby("cohort_week")
    result_rows = []
    for week, group in cohort_groups:
        row = {"Cohort": week}
        row["Total"] = len(group)
        for i, stage in enumerate(PIPELINE_STATUSES):
            row[stage] = len(group[group["status_index"] >= i])
        result_rows.append(row)

    result = pd.DataFrame(result_rows)
    return result.sort_values("Cohort", ascending=False).reset_index(drop=True)
