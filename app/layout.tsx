import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import { AppShell } from "@/components/AppShell";
import "./globals.css";

const headline = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-headline",
  weight: ["600", "700", "800"],
});

const body = Inter({
  subsets: ["latin"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "Kripto Brifing",
  description: "Crypto news and prices at a glance.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${headline.variable} ${body.variable}`}>
      <body className="font-sans bg-paper text-ink antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
