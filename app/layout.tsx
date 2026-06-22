import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Knovo",
  description:
    "Interactive, source-grounded explainers in structural/molecular biology and de novo design.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-white text-neutral-900 antialiased">{children}</body>
    </html>
  );
}
