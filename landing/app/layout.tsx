import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Me'morAI - Arxitektura Ekspertiza Yordamchisi",
  description: "QMQ / ShNQ Qoidalarini AI Tekshiradi. O'zbekistondagi birinchi arxitektura ekspertiza yordamchisi.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uz">
      <body className={`${inter.className} relative`}>
        {children}
      </body>
    </html>
  );
}
