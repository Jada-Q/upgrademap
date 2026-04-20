import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import { FeedbackWidget } from "./components/FeedbackWidget";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = "https://upgrademap.vercel.app";

export const metadata: Metadata = {
  title: "UpgradeMap — 东京23区街区升级预测",
  description:
    "基于房价成交数据和人口统计，交叉分析东京23区的升级信号。发现早期升级区域，辅助投资决策。",
  openGraph: {
    title: "UpgradeMap — 东京23区街区升级预测",
    description:
      "房价动量 x 人口活力交叉分析，发现东京正在升级的街区",
    url: siteUrl,
    siteName: "UpgradeMap",
    locale: "zh_CN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "UpgradeMap — 东京23区街区升级预测",
    description:
      "房价动量 x 人口活力交叉分析，发现东京正在升级的街区",
  },
  metadataBase: new URL(siteUrl),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <FeedbackWidget />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
