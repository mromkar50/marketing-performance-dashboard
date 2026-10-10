// Shared types, constants and formatters for the marketing performance dashboard.

export type CampaignRow = {
  report_date: string; // YYYY-MM-DD
  month: string; // YYYY-MM
  channel: string;
  campaign: string;
  impressions: number;
  clicks: number;
  spend_usd: number;
  leads: number;
  conversions: number;
  new_customers: number;
  revenue_usd: number;
  projected_12m_ltv_usd: number;
};

export function parseCsv(text: string): CampaignRow[] {
  const lines = text.trim().split("\n");
  const rows: CampaignRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const p = lines[i].split(",");
    if (p.length < 11) continue;
    rows.push({
      report_date: p[0],
      month: p[0].slice(0, 7),
      channel: p[1],
      campaign: p[2],
      impressions: Number(p[3]),
      clicks: Number(p[4]),
      spend_usd: Number(p[5]),
      leads: Number(p[6]),
      conversions: Number(p[7]),
      new_customers: Number(p[8]),
      revenue_usd: Number(p[9]),
      projected_12m_ltv_usd: Number(p[10]),
    });
  }
  return rows;
}

export const CHANNELS = [
  "Paid Search",
  "Paid Social",
  "Display",
  "Video",
  "Email",
] as const;

// Safe keys for recharts/CSS-var usage inside the chart config.
export const CHANNEL_KEY: Record<string, string> = {
  "Paid Search": "search",
  "Paid Social": "social",
  Display: "display",
  Video: "video",
  Email: "email",
};

// Business-formal palette: navy + teal + blue family.
export const CHANNEL_COLOR: Record<string, string> = {
  "Paid Search": "#1F4E79",
  "Paid Social": "#17858C",
  Display: "#94A3B8",
  Video: "#5B9BD5",
  Email: "#0B6E4F",
};

const MONTH_LABEL: Record<string, string> = {
  "2025-01": "Jan",
  "2025-02": "Feb",
  "2025-03": "Mar",
  "2025-04": "Apr",
  "2025-05": "May",
  "2025-06": "Jun",
};

export const MONTHS = ["2025-01", "2025-02", "2025-03", "2025-04", "2025-05", "2025-06"];

export function monthShort(m: string): string {
  return MONTH_LABEL[m] ?? m;
}

export function monthLong(m: string): string {
  const s = monthShort(m);
  return s === m ? m : `${s} 2025`;
}

// ---------------------------------------------------------------- formatters
const nfInt = new Intl.NumberFormat("en-US");
const nf1 = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });
const nf2 = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function fmtInt(n: number): string {
  return nfInt.format(Math.round(n));
}

export function fmtMoney(n: number): string {
  return "$" + nf2.format(n);
}

export function fmtMoneyCompact(n: number): string {
  if (Math.abs(n) >= 1_000_000) return "$" + nf2.format(n / 1_000_000) + "M";
  if (Math.abs(n) >= 10_000) return "$" + nf1.format(n / 1_000) + "K";
  return fmtMoney(n);
}

export function fmtPct(x: number): string {
  return nf2.format(x * 100) + "%";
}

export function fmtX(x: number): string {
  return nf2.format(x) + "x";
}

// ---------------------------------------------------------------- aggregation
export type Agg = {
  impressions: number;
  clicks: number;
  spend: number;
  leads: number;
  conversions: number;
  newCustomers: number;
  revenue: number;
  ltv: number;
  ctr: number;
  cvr: number;
  cac: number;
  roas: number;
  avgLtv: number;
};

export function aggregate(rows: CampaignRow[]): Agg {
  let impressions = 0, clicks = 0, spend = 0, leads = 0, conversions = 0,
    newCustomers = 0, revenue = 0, ltv = 0;
  for (const r of rows) {
    impressions += r.impressions;
    clicks += r.clicks;
    spend += r.spend_usd;
    leads += r.leads;
    conversions += r.conversions;
    newCustomers += r.new_customers;
    revenue += r.revenue_usd;
    ltv += r.projected_12m_ltv_usd;
  }
  return {
    impressions, clicks, spend, leads, conversions, newCustomers, revenue, ltv,
    ctr: impressions ? clicks / impressions : 0,
    cvr: clicks ? conversions / clicks : 0,
    cac: newCustomers ? spend / newCustomers : 0,
    roas: spend ? revenue / spend : 0,
    avgLtv: newCustomers ? ltv / newCustomers : 0,
  };
}
