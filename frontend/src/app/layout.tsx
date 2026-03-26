import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TerraNode Command Deck",
  description:
    "Minimal high-impact crop claim demo with zero-knowledge privacy and encrypted submission flows.",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        <main className="relative flex min-h-screen flex-col">
          {children}
        </main>
      </body>
    </html>
  );
}
