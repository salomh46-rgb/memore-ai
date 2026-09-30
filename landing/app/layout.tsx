import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#050B18",
};

export const metadata: Metadata = {
  title: "Me'morAI - Arxitektura Ekspertiza Mini App",
  description: "QMQ / ShNQ Qoidalarini AI Tekshiradi. O'zbekistondagi birinchi arxitektura ekspertiza yordamchisi.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uz" className="dark">
      <head>
        <Script
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="beforeInteractive"
        />
      </head>
      <body className={`${inter.className} relative bg-[#050B18] text-slate-100 min-h-screen antialiased selection:bg-[#4F8EF7]/30 selection:text-[#4F8EF7]`}>
        {children}
      </body>
    </html>
  );
}
