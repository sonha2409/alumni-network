import type { Metadata } from "next";
import { Geist, Geist_Mono, Be_Vietnam_Pro } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
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

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    template: "%s | PTNKAlum",
    default: "PTNKAlum — PTNK Alumni Network",
  },
  description:
    "Connect with PTNK alumni worldwide. Search by career field, education, location, and graduation year. Build meaningful professional connections with fellow graduates.",
  openGraph: {
    type: "website",
    locale: "vi_VN",
    siteName: "PTNKAlum",
    title: "PTNKAlum — PTNK Alumni Network",
    description:
      "Connect with PTNK alumni worldwide. Search by career field, education, location, and graduation year.",
    url: siteUrl,
  },
  twitter: {
    card: "summary_large_image",
    title: "PTNKAlum — PTNK Alumni Network",
    description:
      "Connect with PTNK alumni worldwide. Search by career field, education, location, and graduation year.",
  },
};

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
