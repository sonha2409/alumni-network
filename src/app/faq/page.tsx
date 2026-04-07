import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowLeft, ChevronDown } from "lucide-react";

import { PublicFooter } from "@/components/public-footer";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://ptnkalum.com";

const QUESTION_KEYS = [
  "q1",
  "q2",
  "q3",
  "q4",
  "q5",
  "q6",
  "q7",
  "q8",
  "q9",
  "q10",
] as const;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("faq");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: { canonical: "/faq" },
    openGraph: {
      title: t("metaTitle"),
      description: t("metaDescription"),
      url: `${siteUrl}/faq`,
    },
    twitter: {
      title: t("metaTitle"),
      description: t("metaDescription"),
    },
  };
}

export default async function FaqPage() {
  const t = await getTranslations("faq");
  const tFooter = await getTranslations("publicFooter");

  // F46: FAQPage schema is the biggest SEO win in this feature — Google shows
  // FAQs as expandable Q&A inside the search result itself, taking more SERP
  // real estate than a standard blue link.
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: QUESTION_KEYS.map((key) => ({
      "@type": "Question",
      name: t(`questions.${key}.question`),
      acceptedAnswer: {
        "@type": "Answer",
        text: t(`questions.${key}.answer`),
      },
    })),
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
      {
        "@type": "ListItem",
        position: 2,
        name: "FAQ",
        item: `${siteUrl}/faq`,
      },
    ],
  };

  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd),
        }}
      />

      <nav className="fixed top-0 right-0 left-0 z-50 border-b border-border/40 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            {tFooter("backToHome")}
          </Link>
          <span className="text-lg font-bold tracking-tight">
            <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              PTNKAlum
            </span>
          </span>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden pt-32 pb-16 sm:pt-40 sm:pb-20">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-20 left-1/2 h-[400px] w-[400px] -translate-x-1/2 rounded-full bg-primary/6 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
          <p className="mb-4 text-sm font-semibold tracking-wider text-primary uppercase">
            {t("heroEyebrow")}
          </p>
          <h1 className="text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl">
            {t("heroTitle")}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            {t("heroSubtitle")}
          </p>
        </div>
      </section>

      {/* Q&A list */}
      <section className="mx-auto max-w-3xl px-4 pb-20 sm:px-6 sm:pb-28">
        <div className="space-y-3">
          {QUESTION_KEYS.map((key) => (
            <details
              key={key}
              className="group rounded-2xl border border-border/50 bg-card px-6 py-4 transition-colors hover:border-primary/20 [&_summary::-webkit-details-marker]:hidden"
            >
              <summary className="flex cursor-pointer list-none items-start justify-between gap-4 py-2 text-left">
                <h2 className="text-base font-semibold sm:text-lg">
                  {t(`questions.${key}.question`)}
                </h2>
                <ChevronDown className="mt-1 h-5 w-5 flex-shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
                {t(`questions.${key}.answer`)}
              </p>
            </details>
          ))}
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
