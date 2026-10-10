"""
Emulates the 4 BigQuery queries in project1_queries_bigquery.sql against the
synthetic CSV and exports each result set as a CSV (ready for Tableau Public).

BigQuery logic is reproduced 1:1 with SUM(numerator)/SUM(denominator) ratios
(SAFE_DIVIDE -> guarded division).
"""
import os
import pandas as pd

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "public", "data", "marketing_campaign_daily.csv")
OUT = os.path.join(ROOT, "analysis", "query_results")
os.makedirs(OUT, exist_ok=True)

df = pd.read_csv(SRC, parse_dates=["report_date"])
df["report_date"] = df["report_date"].dt.date
df["report_month"] = pd.to_datetime(df["report_date"]).values.astype("datetime64[M]")

MONEY = ["spend_usd", "revenue_usd", "projected_12m_ltv_usd"]
RATIO = ["ctr", "cvr", "cac_usd", "roas",
         "avg_projected_12m_ltv_per_customer_usd", "projected_ltv_to_spend"]

# --- 1) QA: row count, date range, campaign coverage -------------------------
qa = pd.DataFrame([{
    "row_count": len(df),
    "first_date": df["report_date"].min(),
    "last_date": df["report_date"].max(),
    "channels": df["channel"].nunique(),
    "campaigns": df["campaign"].nunique(),
}])
qa.to_csv(f"{OUT}/qa_summary.csv", index=False)

# --- 2) Channel-level KPI summary --------------------------------------------
g = df.groupby("channel").agg(
    impressions=("impressions", "sum"),
    clicks=("clicks", "sum"),
    spend_usd=("spend_usd", "sum"),
    leads=("leads", "sum"),
    conversions=("conversions", "sum"),
    new_customers=("new_customers", "sum"),
    revenue_usd=("revenue_usd", "sum"),
    projected_12m_ltv_usd=("projected_12m_ltv_usd", "sum"),
).reset_index()

def safe_div(n, d):
    return n / d if d else None

g["ctr"] = g.apply(lambda r: safe_div(r["clicks"], r["impressions"]), axis=1)
g["cvr"] = g.apply(lambda r: safe_div(r["conversions"], r["clicks"]), axis=1)
g["cac_usd"] = g.apply(lambda r: safe_div(r["spend_usd"], r["new_customers"]), axis=1)
g["roas"] = g.apply(lambda r: safe_div(r["revenue_usd"], r["spend_usd"]), axis=1)
g["avg_projected_12m_ltv_per_customer_usd"] = g.apply(
    lambda r: safe_div(r["projected_12m_ltv_usd"], r["new_customers"]), axis=1)
g["projected_ltv_to_spend"] = g.apply(
    lambda r: safe_div(r["projected_12m_ltv_usd"], r["spend_usd"]), axis=1)
g = g.sort_values("roas", ascending=False)
for c in MONEY:
    g[c] = g[c].round(2)
g[RATIO] = g[RATIO].round(6)
g.to_csv(f"{OUT}/channel_summary.csv", index=False)

# --- 3) Monthly trend: one row per month and channel --------------------------
t = df.groupby(["report_month", "channel"]).agg(
    impressions=("impressions", "sum"),
    clicks=("clicks", "sum"),
    spend_usd=("spend_usd", "sum"),
    leads=("leads", "sum"),
    conversions=("conversions", "sum"),
    new_customers=("new_customers", "sum"),
    revenue_usd=("revenue_usd", "sum"),
).reset_index()
t["ctr"] = t["clicks"] / t["impressions"]
t["cvr"] = t["conversions"] / t["clicks"]
t["cac_usd"] = t["spend_usd"] / t["new_customers"]
t["roas"] = t["revenue_usd"] / t["spend_usd"]
t["report_month"] = t["report_month"].dt.date
t = t.sort_values(["report_month", "channel"])
for c in ["spend_usd", "revenue_usd"]:
    t[c] = t[c].round(2)
t[["ctr", "cvr", "cac_usd", "roas"]] = t[["ctr", "cvr", "cac_usd", "roas"]].round(6)
t.to_csv(f"{OUT}/monthly_trend.csv", index=False)

# --- 4) Campaign drill-down: month x channel x campaign ------------------------
d = df.groupby(["report_month", "channel", "campaign"]).agg(
    impressions=("impressions", "sum"),
    clicks=("clicks", "sum"),
    spend_usd=("spend_usd", "sum"),
    leads=("leads", "sum"),
    conversions=("conversions", "sum"),
    new_customers=("new_customers", "sum"),
    revenue_usd=("revenue_usd", "sum"),
    projected_12m_ltv_usd=("projected_12m_ltv_usd", "sum"),
).reset_index()
d["ctr"] = d["clicks"] / d["impressions"]
d["cvr"] = d["conversions"] / d["clicks"]
d["cac_usd"] = d["spend_usd"] / d["new_customers"]
d["roas"] = d["revenue_usd"] / d["spend_usd"]
d["avg_projected_12m_ltv_per_customer_usd"] = d["projected_12m_ltv_usd"] / d["new_customers"]
d["projected_ltv_to_spend"] = d["projected_12m_ltv_usd"] / d["spend_usd"]
d["report_month"] = d["report_month"].dt.date
d = d.sort_values(["report_month", "channel", "campaign"])
for c in MONEY:
    d[c] = d[c].round(2)
d[RATIO] = d[RATIO].round(6)
d.to_csv(f"{OUT}/campaign_drilldown.csv", index=False)

print("QA summary:")
print(qa.to_string(index=False))
print("\nChannel summary (top lines):")
print(g[["channel", "spend_usd", "revenue_usd", "roas", "cac_usd"]].to_string(index=False))
print(f"\nmonthly_trend.csv rows: {len(t)} | campaign_drilldown.csv rows: {len(d)}")
