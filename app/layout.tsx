import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI System Design Guide",
  description: "A production-focused guide to AI system design, RAG, agents, evaluation, and interviews.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
