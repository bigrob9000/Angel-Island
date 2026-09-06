import type { Metadata } from "next";
import { Geist, Geist_Mono, Lora, Cormorant_Garamond } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import "./globals.css";
import { PreferencesProvider } from "@/components/PreferencesProvider";
import { getSiteUrl } from "@/lib/site";

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

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("site");
  const siteName = t("name");
  const tagline = t("tagline");
  const description = t("description");

  return {
    metadataBase: new URL(getSiteUrl()),
    title: {
      default: `${siteName} — ${tagline}`,
      template: `%s · ${siteName}`,
    },
    description,
    applicationName: siteName,
    openGraph: {
      type: "website",
      siteName,
      title: `${siteName} — ${tagline}`,
      description,
    },
    twitter: {
      card: "summary_large_image",
      title: `${siteName} — ${tagline}`,
      description,
    },
    icons: {
      icon: "/angel-island-mark-light.png",
      apple: "/apple-icon",
    },
    appleWebApp: {
      capable: true,
      title: siteName,
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${lora.variable} ${cormorant.variable} antialiased`}
      >
        <NextIntlClientProvider messages={messages}>
          <PreferencesProvider>{children}</PreferencesProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
