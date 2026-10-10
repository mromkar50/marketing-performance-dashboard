"use client";

import { useMemo, useState } from "react";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Line, LineChart, CartesianGrid, XAxis, YAxis,
} from "recharts";
import {
  DollarSign, Users, Calculator, ReceiptText, TrendingUp, RotateCcw,
  Lightbulb, ArrowUpDown,
} from "lucide-react";
import {
  CampaignRow, CHANNELS, CHANNEL_KEY, CHANNEL_COLOR, MONTHS,
  monthShort, monthLong, aggregate, fmtInt, fmtMoney, fmtMoneyCompact, fmtPct, fmtX,
} from "@/lib/dashboard-data";

const chartConfig = {
  search: { label: "Paid Search", color: CHANNEL_COLOR["Paid Search"] },
  social: { label: "Paid Social", color: CHANNEL_COLOR["Paid Social"] },
  display: { label: "Display", color: CHANNEL_COLOR["Display"] },
  video: { label: "Video", color: CHANNEL_COLOR["Video"] },
  email: { label: "Email", color: CHANNEL_COLOR["Email"] },
  search_cac: { label: "Paid Search", color: CHANNEL_COLOR["Paid Search"] },
  social_cac: { label: "Paid Social", color: CHANNEL_COLOR["Paid Social"] },
  display_cac: { label: "Display", color: CHANNEL_COLOR["Display"] },
  video_cac: { label: "Video", color: CHANNEL_COLOR["Video"] },
  email_cac: { label: "Email", color: CHANNEL_COLOR["Email"] },
} satisfies ChartConfig;

const LABEL_BY_KEY: Record<string, string> = {
  search: "Paid Search", social: "Paid Social", display: "Display",
  video: "Video", email: "Email", search_cac: "Paid Search",
  social_cac: "Paid Social", display_cac: "Display", video_cac: "Video", email_cac: "Email",
};

type DrillRow = {
  month: string;
  channel: string;
  campaign: string;
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
  newCustomers: number;
  revenue: number;
  cac: number;
  roas: number;
};

type SortKey = "month" | "channel" | "campaign" | "spend" | "conversions" | "newCustomers" | "cac" | "revenue" | "roas";

export default function Dashboard({ rows }: { rows: CampaignRow[] }) {
  const [channelFilter, setChannelFilter] = useState<string>("ALL");
  const [monthFilter, setMonthFilter] = useState<string>("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("month");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const filtered = useMemo(
    () => rows.filter(
      (r) => (channelFilter === "ALL" || r.channel === channelFilter)
        && (monthFilter === "ALL" || r.month === monthFilter),
    ),
    [rows, channelFilter, monthFilter],
  );

  const kpi = useMemo(() => aggregate(filtered), [filtered]);

  // ---- monthly trend per channel (always full data; independent of filters) --
  const trend = useMemo(() => {
    const buckets = new Map<string, Map<string, CampaignRow[]>>();
    for (const r of rows) {
      let byCh = buckets.get(r.month);
      if (!byCh) { byCh = new Map(); buckets.set(r.month, byCh); }
      const list = byCh.get(r.channel);
      if (list) list.push(r); else byCh.set(r.channel, [r]);
    }
    return MONTHS.map((m) => {
      const entry: Record<string, number | null | string> = { month: monthShort(m) };
      const byCh = buckets.get(m);
      for (const ch of CHANNELS) {
        const list = byCh?.get(ch) ?? [];
        if (!list.length) { entry[CHANNEL_KEY[ch]] = null; continue; }
        const a = aggregate(list);
        entry[CHANNEL_KEY[ch] + "_cac"] = a.cac;
        entry[CHANNEL_KEY[ch]] = a.roas;
      }
      return entry;
    });
  }, [rows]);

  // ---- channel summary (respects filters) ------------------------------------
  const channelSummary = useMemo(() => {
    const groups = new Map<string, CampaignRow[]>();
    for (const r of filtered) {
      const list = groups.get(r.channel);
      if (list) list.push(r); else groups.set(r.channel, [r]);
    }
    return CHANNELS
      .filter((ch) => groups.has(ch))
      .map((ch) => ({ channel: ch, ...aggregate(groups.get(ch)!) }))
      .sort((a, b) => b.roas - a.roas);
  }, [filtered]);

  // ---- campaign drill-down (respects filters) ---------------------------------
  const drilldown = useMemo(() => {
    const groups = new Map<string, CampaignRow[]>();
    for (const r of filtered) {
      const key = `${r.month}|${r.channel}|${r.campaign}`;
      const list = groups.get(key);
      if (list) list.push(r); else groups.set(key, [r]);
    }
    const out: DrillRow[] = [];
    for (const [key, list] of groups) {
      const [month, channel, campaign] = key.split("|");
      const a = aggregate(list);
      out.push({
        month, channel, campaign,
        impressions: a.impressions, clicks: a.clicks, spend: a.spend,
        conversions: a.conversions, newCustomers: a.newCustomers,
        revenue: a.revenue, cac: a.cac, roas: a.roas,
      });
    }
    out.sort((x, y) => {
      const dir = sortDir === "asc" ? 1 : -1;
      const vx = x[sortKey], vy = y[sortKey];
      if (typeof vx === "string" && typeof vy === "string") return vx.localeCompare(vy) * dir;
      return ((vx as number) - (vy as number)) * dir;
    });
    return out;
  }, [filtered, sortKey, sortDir]);

  const toggleSort = (k: SortKey) => {
    if (k === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(k); setSortDir(k === "month" || k === "channel" || k === "campaign" ? "asc" : "desc"); }
  };

  const hasFilter = channelFilter !== "ALL" || monthFilter !== "ALL";

  // ---- insights (computed from the full period) --------------------------------
  const insights = useMemo(() => {
    const byCh = CHANNELS.map((ch) => ({ ch, ...aggregate(rows.filter((r) => r.channel === ch)) }));
    const top = [...byCh].sort((a, b) => b.roas - a.roas)[0];
    const worst = [...byCh].sort((a, b) => a.roas - b.roas)[0];
    const volume = [...byCh].sort((a, b) => b.newCustomers - a.newCustomers)[0];
    const totalNc = byCh.reduce((s, c) => s + c.newCustomers, 0);
    const h1 = aggregate(rows.filter((r) => r.month <= "2025-03"));
    const h2 = aggregate(rows.filter((r) => r.month >= "2025-04"));
    return { top, worst, volume, totalNc, h1, h2 };
  }, [rows]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      {/* ---------------------------------------------------------------- header */}
      <header className="bg-[#0F2A43] text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-7 sm:py-9">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
              Marketing Performance Dashboard
            </h1>
            <Badge variant="outline" className="border-teal-300/40 bg-teal-400/10 text-teal-200">
              Synthetic data
            </Badge>
          </div>
          <p className="mt-2 text-sm text-slate-300">
            EXL Portfolio · Project 1 · Jan 1 – Jun 29, 2025 · 180 days × 5 channels × 15 campaigns
            (2,700 campaign-day records)
          </p>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 sm:px-6 py-6 space-y-6">
        {/* -------------------------------------------------------------- filters */}
        <Card className="border-slate-200">
          <CardContent className="p-4 flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-slate-500 uppercase tracking-wide mr-1">
              Filters
            </span>
            <Select value={channelFilter} onValueChange={setChannelFilter}>
              <SelectTrigger className="w-[190px] bg-white" aria-label="Filter by channel">
                <SelectValue placeholder="Channel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All channels</SelectItem>
                {CHANNELS.map((ch) => (
                  <SelectItem key={ch} value={ch}>{ch}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={monthFilter} onValueChange={setMonthFilter}>
              <SelectTrigger className="w-[150px] bg-white" aria-label="Filter by month">
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All months</SelectItem>
                {MONTHS.map((m) => (
                  <SelectItem key={m} value={m}>{monthLong(m)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {hasFilter && (
              <Button
                variant="ghost"
                size="sm"
                className="text-teal-700 hover:text-teal-800 hover:bg-teal-50"
                onClick={() => { setChannelFilter("ALL"); setMonthFilter("ALL"); }}
              >
                <RotateCcw className="h-4 w-4 mr-1" /> Reset
              </Button>
            )}
            <span className="ml-auto text-xs text-slate-500">
              {fmtInt(filtered.length)} of {fmtInt(rows.length)} records
            </span>
          </CardContent>
        </Card>

        {/* ------------------------------------------------------------ KPI cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <KpiCard
            icon={<DollarSign className="h-5 w-5" />}
            tint="bg-[#0F2A43]/5 text-[#0F2A43]"
            label="Ad Spend"
            value={fmtMoneyCompact(kpi.spend)}
            sub="Total paid-media investment"
          />
          <KpiCard
            icon={<Users className="h-5 w-5" />}
            tint="bg-teal-50 text-teal-700"
            label="New Customers"
            value={fmtInt(kpi.newCustomers)}
            sub="Estimated newly acquired"
          />
          <KpiCard
            icon={<Calculator className="h-5 w-5" />}
            tint="bg-sky-50 text-sky-700"
            label="CAC"
            value={fmtMoney(kpi.cac)}
            sub="Spend ÷ new customers"
          />
          <KpiCard
            icon={<ReceiptText className="h-5 w-5" />}
            tint="bg-[#0B6E4F]/5 text-[#0B6E4F]"
            label="Attributed Revenue"
            value={fmtMoneyCompact(kpi.revenue)}
            sub="Revenue from conversions"
          />
          <KpiCard
            icon={<TrendingUp className="h-5 w-5" />}
            tint="bg-teal-50 text-teal-800"
            label="ROAS"
            value={fmtX(kpi.roas)}
            sub="Revenue ÷ spend"
          />
        </div>

        {/* ------------------------------------------------------- trend charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-[#0F2A43]">Monthly ROAS by channel</CardTitle>
              <CardDescription>Attributed revenue ÷ ad spend, per month</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="aspect-auto h-[300px] w-full">
                <LineChart data={trend} margin={{ left: 4, right: 12, top: 8 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                  <YAxis
                    tickLine={false} axisLine={false} width={38}
                    tickFormatter={(v: number) => `${v}x`}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value, name) => (
                          <div className="flex w-full items-center justify-between gap-4 leading-none">
                            <span className="text-muted-foreground">{LABEL_BY_KEY[name] ?? name}</span>
                            <span className="text-foreground font-mono font-medium tabular-nums">
                              {Number(value).toFixed(2)}x
                            </span>
                          </div>
                        )}
                      />
                    }
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                  {CHANNELS.map((ch) => (
                    <Line
                      key={ch}
                      type="monotone"
                      dataKey={CHANNEL_KEY[ch]}
                      stroke={`var(--color-${CHANNEL_KEY[ch]})`}
                      strokeWidth={2}
                      dot={false}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-[#0F2A43]">Monthly CAC by channel</CardTitle>
              <CardDescription>Ad spend ÷ new customers, per month (lower is better)</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="aspect-auto h-[300px] w-full">
                <LineChart data={trend} margin={{ left: 4, right: 12, top: 8 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                  <YAxis
                    tickLine={false} axisLine={false} width={44}
                    tickFormatter={(v: number) => `$${Math.round(v)}`}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value, name) => (
                          <div className="flex w-full items-center justify-between gap-4 leading-none">
                            <span className="text-muted-foreground">{LABEL_BY_KEY[name] ?? name}</span>
                            <span className="text-foreground font-mono font-medium tabular-nums">
                              ${Number(value).toFixed(2)}
                            </span>
                          </div>
                        )}
                      />
                    }
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                  {CHANNELS.map((ch) => (
                    <Line
                      key={ch}
                      type="monotone"
                      dataKey={`${CHANNEL_KEY[ch]}_cac`}
                      stroke={`var(--color-${CHANNEL_KEY[ch]})`}
                      strokeWidth={2}
                      dot={false}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>

        {/* ------------------------------------------------------------ insights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <InsightCard
            title="Efficiency leader"
            body={`${insights.top.ch} returned the strongest ROAS at ${fmtX(insights.top.roas)} with the lowest CAC (${fmtMoney(insights.top.cac)}) across the period.`}
          />
          <InsightCard
            title="Volume leader"
            body={`${insights.volume.ch} acquired the most new customers (${fmtInt(insights.volume.newCustomers)}, ${Math.round(insights.volume.newCustomers / insights.totalNc * 100)}% of all acquisitions).`}
          />
          <InsightCard
            title="Watch list"
            body={`${insights.worst.ch} trailed at ${fmtX(insights.worst.roas)} ROAS. Overall ROAS moved from ${fmtX(insights.h1.roas)} (Q1) to ${fmtX(insights.h2.roas)} (Q2).`}
          />
        </div>

        {/* ----------------------------------------------------- channel summary */}
        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-[#0F2A43]">Channel summary</CardTitle>
            <CardDescription>
              One row per channel · KPIs recomputed as SUM(numerator) ÷ SUM(denominator)
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 hover:bg-slate-50">
                  <TableHead className="text-left">Channel</TableHead>
                  <TableHead className="text-right">Impressions</TableHead>
                  <TableHead className="text-right">Clicks</TableHead>
                  <TableHead className="text-right">CTR</TableHead>
                  <TableHead className="text-right">CVR</TableHead>
                  <TableHead className="text-right">Spend</TableHead>
                  <TableHead className="text-right">New Cust.</TableHead>
                  <TableHead className="text-right">CAC</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">ROAS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {channelSummary.map((c) => (
                  <TableRow key={c.channel}>
                    <TableCell className="font-medium text-[#0F2A43]">
                      <span className="inline-flex items-center gap-2">
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-sm"
                          style={{ backgroundColor: CHANNEL_COLOR[c.channel] }}
                        />
                        {c.channel}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{fmtInt(c.impressions)}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtInt(c.clicks)}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtPct(c.ctr)}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtPct(c.cvr)}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtMoney(c.spend)}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtInt(c.newCustomers)}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtMoney(c.cac)}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtMoney(c.revenue)}</TableCell>
                    <TableCell className="text-right tabular-nums font-medium text-teal-700">
                      {fmtX(c.roas)}
                    </TableCell>
                  </TableRow>
                ))}
                {channelSummary.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-sm text-slate-500 py-8">
                      No records match the current filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* -------------------------------------------------- campaign drill-down */}
        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-[#0F2A43]">Campaign drill-down</CardTitle>
            <CardDescription>
              Month × channel × campaign · click a column header to sort
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-[480px] overflow-y-auto overflow-x-auto rounded-md border">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-slate-50">
                  <TableRow className="hover:bg-slate-50">
                    <SortHead label="Month" k="month" sortKey={sortKey} dir={sortDir} onSort={toggleSort} />
                    <SortHead label="Channel" k="channel" sortKey={sortKey} dir={sortDir} onSort={toggleSort} />
                    <SortHead label="Campaign" k="campaign" sortKey={sortKey} dir={sortDir} onSort={toggleSort} />
                    <SortHead label="Spend" k="spend" sortKey={sortKey} dir={sortDir} onSort={toggleSort} right />
                    <SortHead label="Conv." k="conversions" sortKey={sortKey} dir={sortDir} onSort={toggleSort} right />
                    <SortHead label="New Cust." k="newCustomers" sortKey={sortKey} dir={sortDir} onSort={toggleSort} right />
                    <SortHead label="CAC" k="cac" sortKey={sortKey} dir={sortDir} onSort={toggleSort} right />
                    <SortHead label="Revenue" k="revenue" sortKey={sortKey} dir={sortDir} onSort={toggleSort} right />
                    <SortHead label="ROAS" k="roas" sortKey={sortKey} dir={sortDir} onSort={toggleSort} right />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {drilldown.map((d) => (
                    <TableRow key={`${d.month}|${d.channel}|${d.campaign}`}>
                      <TableCell className="whitespace-nowrap">{monthShort(d.month)}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        <Badge variant="outline" className="font-normal text-slate-600">
                          {d.channel}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-[#0F2A43]">{d.campaign}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtMoney(d.spend)}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtInt(d.conversions)}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtInt(d.newCustomers)}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtMoney(d.cac)}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtMoney(d.revenue)}</TableCell>
                      <TableCell
                        className={`text-right tabular-nums font-medium ${d.roas >= 3 ? "text-teal-700" : d.roas < 2 ? "text-amber-600" : ""}`}
                      >
                        {fmtX(d.roas)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {drilldown.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-sm text-slate-500 py-8">
                        No records match the current filters.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* ---------------------------------------------------------------- footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-5 text-xs leading-relaxed text-slate-500 space-y-1">
          <p>
            All figures are synthetic and for portfolio demonstration only — no real client or
            employer data. KPI formulas: ROAS = attributed revenue ÷ ad spend · CAC = spend ÷ new
            customers · CTR = clicks ÷ impressions · CVR = conversions ÷ clicks · Avg. projected
            12-mo LTV = projected LTV ÷ new customers.
          </p>
          <p>
            Ratios are always recomputed from aggregated numerators and denominators
            (SUM ÷ SUM), never by averaging daily ratios — matching the BigQuery analysis layer in
            project1_queries_bigquery.sql.
          </p>
        </div>
      </footer>
    </div>
  );
}

/* ------------------------------------------------------------------ pieces */

function KpiCard({
  icon, tint, label, value, sub,
}: {
  icon: React.ReactNode; tint: string; label: string; value: string; sub: string;
}) {
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</span>
          <span className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${tint}`}>
            {icon}
          </span>
        </div>
        <div className="mt-2 text-2xl font-semibold text-[#0F2A43] tabular-nums">{value}</div>
        <div className="mt-1 text-xs text-slate-500">{sub}</div>
      </CardContent>
    </Card>
  );
}

function InsightCard({ title, body }: { title: string; body: string }) {
  return (
    <Card className="border-slate-200">
      <CardContent className="p-4 flex gap-3">
        <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
          <Lightbulb className="h-4 w-4" />
        </span>
        <div>
          <div className="text-sm font-semibold text-[#0F2A43]">{title}</div>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">{body}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function SortHead({
  label, k, sortKey, dir, onSort, right = false,
}: {
  label: string; k: SortKey; sortKey: SortKey; dir: "asc" | "desc";
  onSort: (k: SortKey) => void; right?: boolean;
}) {
  const active = k === sortKey;
  return (
    <TableHead className={right ? "text-right" : "text-left"}>
      <button
        type="button"
        onClick={() => onSort(k)}
        className={`inline-flex items-center gap-1 text-xs font-medium hover:text-[#0F2A43] ${active ? "text-[#0F2A43]" : "text-slate-500"}`}
        aria-label={`Sort by ${label}`}
      >
        {label}
        <ArrowUpDown className={`h-3 w-3 ${active ? "opacity-100" : "opacity-40"}`} />
        {active && <span className="sr-only">{dir === "asc" ? "ascending" : "descending"}</span>}
      </button>
    </TableHead>
  );
}
