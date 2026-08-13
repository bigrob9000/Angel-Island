import type { Metadata } from "next";
import { Geist, Geist_Mono, Lora, Cormorant_Garamond } from "next/font/google";
import "./globals.css";
import { PreferencesProvider } from "@/components/PreferencesProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
});

const cormorant = Cormorant_Garamond({
  variable: "--font-brand",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Angel Island — A place for musicians and creatives",
  description:
    "A calm, consent-first platform for musicians to find each other, collaborate, and talk about music — without pressure, clout, or performance.",
  icons: {
    icon: "/angel-island-mark.png",
    apple: "/angel-island-mark.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${lora.variable} ${cormorant.variable} antialiased`}
      >
        <PreferencesProvider>{children}</PreferencesProvider>
      </body>
    </html>
  );
}
