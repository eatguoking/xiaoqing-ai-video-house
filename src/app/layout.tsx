import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "\u5c0f\u6674\u7684AI\u5f71\u89c6\u5999\u5999\u5c4b",
  description: "\u672c\u5730 AI \u5f71\u89c6\u5236\u4f5c\u5de5\u4f5c\u53f0"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
