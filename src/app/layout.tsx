import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Be_Vietnam_Pro } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { NuqsAdapter } from "nuqs/adapters/next";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const beVietnamPro = Be_Vietnam_Pro({
  variable: "--font-be-vietnam-pro",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://ptnkalum.com";

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("seo");
  const locale = await getLocale();
  const ogLocale = locale === "vi" ? "vi_VN" : "en_US";
  const alternateLocale = locale === "vi" ? "en_US" : "vi_VN";

  return {
    metadataBase: new URL(siteUrl),
    title: {
      template: `%s | ${t("brand")}`,
      default: t("rootTitle"),
    },
    description: t("rootDescription"),
    keywords: [
      "PTNKAlum",
      "PTNK",
      "PTNK alumni",
      "PTNK alumni network",
      "cựu học sinh PTNK",
      "cựu học sinh Phổ thông Năng khiếu",
      "Phổ thông Năng khiếu",
      "Trường Phổ thông Năng khiếu",
      "mạng lưới cựu học sinh PTNK",
      "kết nối cựu học sinh PTNK",
      "cộng đồng cựu học sinh Phổ thông Năng khiếu",
      "VNU-HCM alumni",
      "Đại học Quốc gia TP.HCM",
    ],
    alternates: {
      canonical: "/",
      languages: {
        en: "/",
        vi: "/",
        "x-default": "/",
      },
    },
    openGraph: {
      type: "website",
      locale: ogLocale,
      alternateLocale: [alternateLocale],
      siteName: "PTNKAlum",
      title: t("ogTitle"),
      description: t("ogDescription"),
      url: siteUrl,
    },
    twitter: {
      card: "summary_large_image",
      title: t("ogTitle"),
      description: t("ogDescription"),
    },
    verification: {
      google: "scEHI-VQceAIXvzX8PbOZOb3GyF2-ozxRLlO5_EmaZw",
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
    <html lang={locale} suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${beVietnamPro.variable} antialiased`}
      >
        <NextIntlClientProvider locale={locale} messages={messages}>
          <NuqsAdapter>{children}</NuqsAdapter>
          <Toaster />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
