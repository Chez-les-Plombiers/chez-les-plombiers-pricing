import type { Metadata } from "next";
import { Inter, Space_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  weight: ["400", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Tarifs Location — Chez Les Plombiers",
  description:
    "Calendrier de prix dynamique pour la location du lieu événementiel Chez Les Plombiers, 39 rue des Bourdonnais, Paris 1er.",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className={`${inter.variable} ${spaceMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
