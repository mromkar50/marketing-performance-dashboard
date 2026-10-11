-- Portfolio Project 1: Marketing Performance Dashboard
-- SQL dialect: Google BigQuery Standard SQL
-- Replace `YOUR_PROJECT_ID.marketing_analytics.campaign_daily` with your actual table path.

-- 1) QA: row count, date range, and campaign coverage.
SELECT COUNT(*) AS row_count,
       MIN(report_date) AS first_date,
       MAX(report_date) AS last_date,
       COUNT(DISTINCT channel) AS channels,
       COUNT(DISTINCT campaign) AS campaigns
FROM `YOUR_PROJECT_ID.marketing_analytics.campaign_daily`;

-- 2) Channel-level KPI summary: one row per channel.
SELECT channel,
       SUM(impressions) AS impressions,
       SUM(clicks) AS clicks,
       SUM(spend_usd) AS spend_usd,
       SUM(leads) AS leads,
       SUM(conversions) AS conversions,
       SUM(new_customers) AS new_customers,
       SUM(revenue_usd) AS revenue_usd,
       SUM(projected_12m_ltv_usd) AS projected_12m_ltv_usd,
       SAFE_DIVIDE(SUM(clicks), SUM(impressions)) AS ctr,
       SAFE_DIVIDE(SUM(conversions), SUM(clicks)) AS cvr,
       SAFE_DIVIDE(SUM(spend_usd), SUM(new_customers)) AS cac_usd,
       SAFE_DIVIDE(SUM(revenue_usd), SUM(spend_usd)) AS roas,
       SAFE_DIVIDE(SUM(projected_12m_ltv_usd), SUM(new_customers)) AS avg_projected_12m_ltv_per_customer_usd,
       SAFE_DIVIDE(SUM(projected_12m_ltv_usd), SUM(spend_usd)) AS projected_ltv_to_spend
FROM `YOUR_PROJECT_ID.marketing_analytics.campaign_daily`
GROUP BY channel
ORDER BY roas DESC;

-- 3) Monthly trend: one row per month and channel.
SELECT DATE_TRUNC(report_date, MONTH) AS report_month,
       channel,
       SUM(impressions) AS impressions,
       SUM(clicks) AS clicks,
       SUM(spend_usd) AS spend_usd,
       SUM(leads) AS leads,
       SUM(conversions) AS conversions,
       SUM(new_customers) AS new_customers,
       SUM(revenue_usd) AS revenue_usd,
       SAFE_DIVIDE(SUM(clicks), SUM(impressions)) AS ctr,
       SAFE_DIVIDE(SUM(conversions), SUM(clicks)) AS cvr,
       SAFE_DIVIDE(SUM(spend_usd), SUM(new_customers)) AS cac_usd,
       SAFE_DIVIDE(SUM(revenue_usd), SUM(spend_usd)) AS roas
FROM `YOUR_PROJECT_ID.marketing_analytics.campaign_daily`
GROUP BY report_month, channel
ORDER BY report_month, channel;

-- 4) Campaign drill-down: one row per month, channel, campaign.
SELECT DATE_TRUNC(report_date, MONTH) AS report_month,
       channel,
       campaign,
       SUM(impressions) AS impressions,
       SUM(clicks) AS clicks,
       SUM(spend_usd) AS spend_usd,
       SUM(leads) AS leads,
       SUM(conversions) AS conversions,
       SUM(new_customers) AS new_customers,
       SUM(revenue_usd) AS revenue_usd,
       SUM(projected_12m_ltv_usd) AS projected_12m_ltv_usd,
       SAFE_DIVIDE(SUM(clicks), SUM(impressions)) AS ctr,
       SAFE_DIVIDE(SUM(conversions), SUM(clicks)) AS cvr,
       SAFE_DIVIDE(SUM(spend_usd), SUM(new_customers)) AS cac_usd,
       SAFE_DIVIDE(SUM(revenue_usd), SUM(spend_usd)) AS roas,
       SAFE_DIVIDE(SUM(projected_12m_ltv_usd), SUM(new_customers)) AS avg_projected_12m_ltv_per_customer_usd,
       SAFE_DIVIDE(SUM(projected_12m_ltv_usd), SUM(spend_usd)) AS projected_ltv_to_spend
FROM `YOUR_PROJECT_ID.marketing_analytics.campaign_daily`
GROUP BY report_month, channel, campaign
ORDER BY report_month, channel, campaign;

-- KPI definitions: CTR = clicks/impressions; CVR = conversions/clicks;
-- CAC = spend/new_customers; ROAS = revenue/spend.
-- For any rollup, recompute ratios from summed numerators/denominators. Do not average ratios.
