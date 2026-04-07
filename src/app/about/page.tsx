import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowLeft, ArrowRight, Mail } from "lucide-react";

import { PublicFooter } from "@/components/public-footer";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://ptnkalum.com";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("about");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: { canonical: "/about" },
    openGraph: {
      title: t("metaTitle"),
      description: t("metaDescription"),
      url: `${siteUrl}/about`,
    },
    twitter: {
      title: t("metaTitle"),
      description: t("metaDescription"),
    },
  };
}

// F46: Breadcrumb schema helps Google render /about as a second-level page
// under the homepage in search results.
const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
    {
      "@type": "ListItem",
      position: 2,
      name: "About",
      item: `${siteUrl}/about`,
    },
  ],
};

export default async function AboutPage() {
  const t = await getTranslations("about");
  const tFooter = await getTranslations("publicFooter");

  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd),
        }}
      />

      {/* Minimal nav — just a back-to-home link. Keeps the page focused. */}
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
      <section className="relative overflow-hidden pt-32 pb-20 sm:pt-40 sm:pb-28">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-20 left-1/4 h-[400px] w-[400px] rounded-full bg-primary/8 blur-3xl" />
          <div className="absolute right-1/4 bottom-0 h-[300px] w-[300px] rounded-full bg-chart-4/8 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
          <p className="mb-4 text-sm font-semibold tracking-wider text-primary uppercase">
            {t("heroEyebrow")}
          </p>
          <h1 className="text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl md:text-6xl">
            {t("heroTitle")}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
            {t("heroSubtitle")}
          </p>
        </div>
      </section>

      {/* Content sections */}
      <article className="mx-auto max-w-3xl px-4 pb-20 sm:px-6 sm:pb-28">
        <section className="border-t border-border/40 py-12">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {t("missionTitle")}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t("missionBody")}
          </p>
        </section>

        <section className="border-t border-border/40 py-12">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {t("schoolTitle")}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t("schoolBody")}
          </p>
        </section>

        <section className="border-t border-border/40 py-12">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {t("networkTitle")}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t("networkBody")}
          </p>
        </section>

        <section className="border-t border-border/40 py-12">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {t("contactTitle")}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t("contactBody")}
          </p>
          <a
            href={`mailto:${t("contactEmail")}`}
            className="mt-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-5 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
          >
            <Mail className="h-4 w-4" />
            {t("contactEmail")}
          </a>
        </section>
      </article>

      {/* CTA */}
      <section className="relative overflow-hidden border-t border-border/40 py-20 sm:py-24">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute bottom-0 left-1/2 h-[300px] w-[400px] -translate-x-1/2 rounded-full bg-primary/6 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-2xl px-4 text-center sm:px-6">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {t("ctaTitle")}
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            {t("ctaSubtitle")}
          </p>
          <div className="mt-8">
            <Link
              href="/signup"
              className="group inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-8 text-base font-medium text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/30"
            >
              {t("ctaButton")}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
