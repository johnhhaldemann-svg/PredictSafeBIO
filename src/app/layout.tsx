import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PredictSafeBIO",
  description: "AI-powered biosafety intelligence platform for biotech EHS, compliance, and audit readiness."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
