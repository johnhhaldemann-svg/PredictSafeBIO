import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PredictSafeBIO",
  description: "Biotech AI Engine MVP foundation with deterministic risk scoring."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
