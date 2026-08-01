import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import legalData from "./legal-data.json";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: `PKH · VKH Ratenrechner ${legalData.calculationYear}`,
  description: "Lokale Ratenberechnung für Prozess- und Verfahrenskostenhilfe nach § 115 ZPO.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>{children}</body>
    </html>
  );
}
