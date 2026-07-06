import type { Metadata } from "next";

import { Providers } from "@/components/providers";

import "./globals.css";

export const metadata: Metadata = {
  title: "StudyLens AI",
  description: "A premium AI study assistant for documents, summaries, and RAG chat.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased dark"
      suppressHydrationWarning
    >
      <body className="min-h-full bg-slate-950 font-sans text-slate-100">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
