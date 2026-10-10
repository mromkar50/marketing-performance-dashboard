# Project 1 — Data Dictionary

**Dataset:** `marketing_campaign_daily.csv`  
**Type:** Synthetic (fictional) performance data; not real company/client data.  
**Grain:** One row per date × channel × campaign.  
**Coverage:** 180 dates, 5 paid channels, 15 campaigns (2,700 rows).  
**Currency:** USD.

| Field | Meaning | Type |
|---|---|---|
| `report_date` | Reporting date | Date |
| `channel` | Paid media channel | Text |
| `campaign` | Fictional campaign name | Text |
| `impressions` | Ad impressions served | Integer |
| `clicks` | Ad clicks | Integer |
| `spend_usd` | Advertising cost for the date/campaign | Decimal USD |
| `leads` | Leads attributed to the campaign | Integer |
| `conversions` | Purchase/conversion events attributed to the campaign | Integer |
| `new_customers` | Estimated newly acquired customers; can be lower than conversions | Integer |
| `revenue_usd` | Attributed revenue from conversions | Decimal USD |
| `projected_12m_ltv_usd` | Estimated aggregate 12-month value for new customers acquired that day | Decimal USD |

## KPI definitions
- **CTR** = total clicks ÷ total impressions.
- **CVR** = total conversions ÷ total clicks.
- **CAC** = total ad spend ÷ total new customers.
- **ROAS** = attributed revenue ÷ ad spend.
- **Average projected 12-month LTV** = projected 12-month LTV total ÷ new customers.
- **Projected LTV-to-spend** = projected 12-month LTV total ÷ ad spend. This is not the same as a cohort-based LTV:CAC ratio; Project 3 will examine that separately.

Always calculate aggregate KPIs from aggregated numerators and denominators. For example, channel CTR is `SUM(clicks) / SUM(impressions)`, not the average of daily CTR values.
