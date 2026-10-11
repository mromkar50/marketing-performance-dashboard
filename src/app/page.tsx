import { readFile } from "fs/promises";
import path from "path";
import Dashboard from "@/components/dashboard";
import { parseCsv } from "@/lib/dashboard-data";

export const dynamic = "force-static";

export default async function Page() {
  const csvPath = path.join(process.cwd(), "public", "data", "marketing_campaign_daily.csv");
  const csv = await readFile(csvPath, "utf8");
  const rows = parseCsv(csv);

  if (rows.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">Campaign data could not be loaded.</p>
      </div>
    );
  }

  return <Dashboard rows={rows} />;
}
