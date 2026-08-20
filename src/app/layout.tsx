import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Daniélou Abidjan — Gestion scolaire",
  description:
    "Plateforme de gestion scolaire Daniélou Abidjan : élèves, évaluations, bulletins et analyse.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full font-sans text-text-primary">
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
