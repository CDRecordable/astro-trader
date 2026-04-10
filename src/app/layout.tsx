import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Astro Trader Insights",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
