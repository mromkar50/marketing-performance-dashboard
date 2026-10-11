"""
Portfolio Project 1 — Synthetic marketing campaign daily data generator.

Grain : one row per report_date x channel x campaign
Size  : 180 dates (2025-01-01 .. 2025-06-29) x 5 channels x 3 campaigns = 2,700 rows
Style : realistic patterns — weekend dips, channel-specific funnel efficiency,
        mild seasonal drift, campaign momentum, promo spikes, log-normal noise.

All figures are fictional. Deterministic (seed=42) so the portfolio repo is reproducible.
"""
import csv
import math
import os
import random
from datetime import date, timedelta

random.seed(42)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_PATH = os.path.join(ROOT, "public", "data", "marketing_campaign_daily.csv")

START = date(2025, 1, 1)
DAYS = 180  # 2025-01-01 .. 2025-06-29 inclusive

# ----------------------------------------------------------------------------
# Channel profiles: base funnel economics (per campaign-day, before noise)
#   roas = cvr * aov / cpc
# ----------------------------------------------------------------------------
CHANNELS = {
    "Paid Search": {
        "cpc": 2.60, "ctr": 0.048, "cvr": 0.065, "aov": 175.0,
        "spend": (420, 520),          # daily base spend range per campaign
        "lead_rate": 0.14, "nc_rate": 0.66, "ltv": 320.0,
        "weekend": (0.84, 0.80),      # Sat, Sun spend multipliers
        "sigma": 0.13,
        "campaigns": {
            "Search - Brand Terms":        {"spend_mult": 1.25, "cvr_mult": 1.30, "momentum": +0.002},
            "Search - Generic Keywords":   {"spend_mult": 1.00, "cvr_mult": 0.90, "momentum": 0.000},
            "Search - Competitor Terms":   {"spend_mult": 0.72, "cvr_mult": 0.72, "momentum": -0.001},
        },
    },
    "Paid Social": {
        "cpc": 1.35, "ctr": 0.016, "cvr": 0.032, "aov": 115.0,
        "spend": (480, 620),
        "lead_rate": 0.11, "nc_rate": 0.64, "ltv": 260.0,
        "weekend": (0.86, 0.82),
        "sigma": 0.15,
        "campaigns": {
            "Social - Prospecting Wide":   {"spend_mult": 1.15, "cvr_mult": 0.85, "momentum": -0.0012},
            "Social - Retargeting Core":   {"spend_mult": 0.80, "cvr_mult": 1.45, "momentum": +0.0008},
            "Social - Lookalike Launch":   {"spend_mult": 1.00, "cvr_mult": 1.05, "momentum": +0.0015},
        },
    },
    "Display": {
        "cpc": 1.10, "ctr": 0.0045, "cvr": 0.018, "aov": 85.0,
        "spend": (280, 380),
        "lead_rate": 0.07, "nc_rate": 0.62, "ltv": 210.0,
        "weekend": (0.80, 0.76),
        "sigma": 0.17,
        "campaigns": {
            "Display - Programmatic Reach":    {"spend_mult": 1.20, "cvr_mult": 0.90, "momentum": -0.0015},
            "Display - Retargeting Banners":   {"spend_mult": 0.85, "cvr_mult": 1.50, "momentum": +0.0005},
            "Display - Publisher Placements":  {"spend_mult": 0.95, "cvr_mult": 0.85, "momentum": -0.0008},
        },
    },
    "Video": {
        "cpc": 0.55, "ctr": 0.0075, "cvr": 0.010, "aov": 95.0,
        "spend": (520, 680),
        "lead_rate": 0.05, "nc_rate": 0.60, "ltv": 240.0,
        "weekend": (0.90, 0.88),
        "sigma": 0.16,
        "campaigns": {
            "Video - Pre-roll Awareness":  {"spend_mult": 1.10, "cvr_mult": 0.95, "momentum": -0.0010},
            "Video - YouTube In-stream":   {"spend_mult": 1.05, "cvr_mult": 1.15, "momentum": +0.0010},
            "Video - Connected TV Promo":  {"spend_mult": 0.90, "cvr_mult": 0.85, "momentum": +0.0020},
        },
    },
    "Email": {
        "cpc": 1.20, "ctr": 0.036, "cvr": 0.050, "aov": 120.0,
        "spend": (130, 190),
        "lead_rate": 0.18, "nc_rate": 0.72, "ltv": 290.0,
        "weekend": (0.92, 0.88),
        "sigma": 0.14,
        "campaigns": {
            "Email - Newsletter Promo":    {"spend_mult": 1.15, "cvr_mult": 1.05, "momentum": 0.0000},
            "Email - Lifecycle Nurture":   {"spend_mult": 0.95, "cvr_mult": 1.15, "momentum": +0.0010},
            "Email - Winback Offer":       {"spend_mult": 0.70, "cvr_mult": 0.85, "momentum": -0.0015},
        },
    },
}

# Month-level seasonality multipliers (Jan..Jun): mild uplift toward summer
MONTH_SEASON = {1: 0.95, 2: 0.97, 3: 1.00, 4: 1.03, 5: 1.06, 6: 1.04}

# Promo windows (inclusive): demand spikes; (spend multiplier, cvr multiplier)
PROMOS = [
    (date(2025, 2, 10), date(2025, 2, 14), 1.30, 1.20),  # Valentine's push
    (date(2025, 3, 20), date(2025, 3, 25), 1.35, 1.25),  # Spring sale
    (date(2025, 5, 22), date(2025, 5, 26), 1.45, 1.30),  # Memorial Day promo
]


def lognorm_noise(sigma: float) -> float:
    """Multiplicative log-normal noise centred on 1.0."""
    return math.exp(random.gauss(0.0, sigma))


def promo_factor(d: date):
    for start, end, s_mult, c_mult in PROMOS:
        if start <= d <= end:
            return s_mult, c_mult
    return 1.0, 1.0


def clamp_int(x: float, lo: int = 0) -> int:
    return max(lo, int(round(x)))


def main() -> None:
    rows = []
    for i in range(DAYS):
        d = START + timedelta(days=i)
        weekend = d.weekday() >= 5  # 5=Sat, 6=Sun
        season = MONTH_SEASON[d.month]
        s_promo, c_promo = promo_factor(d)

        for channel, p in CHANNELS.items():
            if weekend:
                wk = p["weekend"][0] if d.weekday() == 5 else p["weekend"][1]
            else:
                wk = 1.0

            for campaign, cp in p["campaigns"].items():
                # campaign momentum: gradual budget/performance drift over the horizon
                mom = 1.0 + cp["momentum"] * (i - DAYS / 2)

                # --- spend -------------------------------------------------
                lo, hi = p["spend"]
                base_spend = random.uniform(lo, hi) * cp["spend_mult"]
                spend = base_spend * season * wk * s_promo * mom * lognorm_noise(p["sigma"] * 0.7)

                # --- clicks / impressions ----------------------------------
                cpc = p["cpc"] * lognorm_noise(p["sigma"] * 0.8)
                clicks = clamp_int(spend / cpc)
                ctr = p["ctr"] * lognorm_noise(p["sigma"])
                impressions = clamp_int(clicks / ctr) if ctr > 0 else 0

                # --- conversion funnel --------------------------------------
                cvr = p["cvr"] * cp["cvr_mult"] * c_promo * mom * lognorm_noise(p["sigma"])
                conversions = clamp_int(clicks * cvr)
                leads = clamp_int(clicks * p["lead_rate"] * lognorm_noise(p["sigma"] * 0.8))
                new_customers = clamp_int(conversions * p["nc_rate"] * lognorm_noise(p["sigma"] * 0.6))

                # --- money ---------------------------------------------------
                aov = p["aov"] * lognorm_noise(p["sigma"] * 0.7)
                revenue = round(conversions * aov, 2)
                ltv_per_cust = p["ltv"] * lognorm_noise(p["sigma"] * 0.6)
                ltv = round(new_customers * ltv_per_cust, 2)

                spend = round(spend, 2)

                # --- consistency guards --------------------------------------
                if new_customers > conversions:
                    new_customers = conversions
                if leads > clicks:
                    leads = clicks
                if clicks > impressions:
                    impressions = clicks

                rows.append([
                    d.isoformat(), channel, campaign,
                    impressions, clicks, f"{spend:.2f}",
                    leads, conversions, new_customers,
                    f"{revenue:.2f}", f"{ltv:.2f}",
                ])

    # --- QA before writing -----------------------------------------------------
    assert len(rows) == 2700, f"row count {len(rows)} != 2700"
    dates = sorted({r[0] for r in rows})
    assert dates[0] == "2025-01-01" and dates[-1] == "2025-06-29", (dates[0], dates[-1])
    assert len(dates) == 180
    assert len({r[1] for r in rows}) == 5
    assert len({r[2] for r in rows}) == 15
    for r in rows:
        imp, clk = int(r[3]), int(r[4])
        ld, cv, nc = int(r[6]), int(r[7]), int(r[8])
        assert clk <= imp and cv <= clk and nc <= cv and ld <= clk, r

    header = ["report_date", "channel", "campaign", "impressions", "clicks",
              "spend_usd", "leads", "conversions", "new_customers",
              "revenue_usd", "projected_12m_ltv_usd"]
    with open(OUT_PATH, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(header)
        w.writerows(rows)

    # --- console summary --------------------------------------------------------
    print(f"Wrote {len(rows)} rows -> {OUT_PATH}")
    agg: dict = {}
    for r in rows:
        ch = r[1]
        a = agg.setdefault(ch, dict(sp=0.0, rev=0.0, nc=0, cv=0, clk=0, imp=0, ltv=0.0))
        a["sp"] += float(r[5]); a["rev"] += float(r[9]); a["ltv"] += float(r[10])
        a["nc"] += int(r[8]); a["cv"] += int(r[7]); a["clk"] += int(r[4]); a["imp"] += int(r[3])

    print(f"{'channel':<13}{'spend':>12}{'revenue':>12}{'ROAS':>7}{'CAC':>8}{'newCust':>9}{'CTR%':>7}{'CVR%':>7}")
    tot_sp = tot_rev = tot_nc = 0
    for ch, a in sorted(agg.items(), key=lambda kv: kv[1]["rev"] / kv[1]["sp"], reverse=True):
        roas = a["rev"] / a["sp"]; cac = a["sp"] / a["nc"]
        ctr = a["clk"] / a["imp"] * 100; cvr = a["cv"] / a["clk"] * 100
        tot_sp += a["sp"]; tot_rev += a["rev"]; tot_nc += a["nc"]
        print(f"{ch:<13}{a['sp']:>12,.0f}{a['rev']:>12,.0f}{roas:>7.2f}{cac:>8.2f}{a['nc']:>9,}{ctr:>7.2f}{cvr:>7.2f}")
    print(f"{'TOTAL':<13}{tot_sp:>12,.0f}{tot_rev:>12,.0f}{tot_rev/tot_sp:>7.2f}{tot_sp/tot_nc:>8.2f}{tot_nc:>9,}")


if __name__ == "__main__":
    main()
