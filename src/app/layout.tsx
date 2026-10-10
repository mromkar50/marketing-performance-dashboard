import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Marketing Performance Dashboard — EXL Portfolio Project 1",
  description:
    "Interactive marketing performance dashboard built on 2,700 synthetic campaign-day records: KPI cards, monthly ROAS/CAC trends by channel, and a filterable campaign drill-down.",
  keywords: ["marketing analytics", "dashboard", "ROAS", "CAC", "BigQuery", "Tableau", "portfolio"],
  authors: [{ name: "EXL Portfolio" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "Marketing Performance Dashboard — EXL Portfolio Project 1",
    description:
      "KPI cards, monthly ROAS/CAC trend by channel, and campaign drill-down on synthetic data.",
    siteName: "EXL Portfolio",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
