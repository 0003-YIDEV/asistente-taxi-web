import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { FloatingNav } from "@/components/FloatingNav";
import { AsistenteFlotante } from "@/components/AsistenteFlotante";
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
  title: "Asistente Taxi 2026 · Gestión Fiscal y Administrativa",
  description:
    "Núcleo de gestión para asesoría de taxistas autónomos (IAE 721.2).",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <FloatingNav />
        <AsistenteFlotante />
      </body>
    </html>
  );
}
