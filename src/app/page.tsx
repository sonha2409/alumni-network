import Link from "next/link";
import { getTranslations } from "next-intl/server";
import {
  Search,
  Users,
  MessageCircle,
  Globe,
  Shield,
  Sparkles,
  ArrowRight,
  UserPlus,
  CheckCircle,
  Handshake,
} from "lucide-react";

export default async function LandingPage() {
  const t = await getTranslations("landing");

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 right-0 left-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <span className="text-xl font-bold tracking-tight">
            {t("brand")}
          </span>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="inline-flex h-9 items-center justify-center rounded-lg px-4 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {t("logIn")}
            </Link>
            <Link
              href="/signup"
              className="inline-flex h-9 items-center justify-center rounded-full bg-foreground px-5 text-sm font-medium text-background transition-colors hover:bg-foreground/90"
            >
              {t("getStarted")}
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="landing-hero relative flex min-h-[90vh] items-center overflow-hidden pt-16">
        {/* Background decoration */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-20 left-1/4 h-[500px] w-[500px] rounded-full bg-chart-1/10 blur-3xl" />
          <div className="absolute right-1/4 bottom-20 h-[400px] w-[400px] rounded-full bg-chart-3/10 blur-3xl" />
          <div className="absolute top-1/2 left-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-chart-5/5 blur-3xl" />
        </div>

        {/* Grid pattern overlay */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-3xl text-center">
            {/* Badge */}
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-border bg-background/80 px-4 py-1.5 text-sm text-muted-foreground backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5" />
              <span>{t("heroBadge")}</span>
            </div>

            <h1 className="text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
              {t("heroTitle")}
              <span className="landing-gradient-text block">
                {t("heroTitleAccent")}
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
              {t("heroSubtitle")}
            </p>

            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link
                href="/signup"
                className="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-foreground px-8 text-base font-medium text-background transition-all hover:bg-foreground/90 sm:w-auto"
              >
                {t("heroCtaPrimary")}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/login"
                className="inline-flex h-12 w-full items-center justify-center rounded-full border border-border bg-background px-8 text-base font-medium transition-colors hover:bg-muted sm:w-auto"
              >
                {t("heroCtaSecondary")}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="border-t border-border/50 py-24 sm:py-32">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {t("featuresTitle")}
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              {t("featuresSubtitle")}
            </p>
          </div>

          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: Search,
                title: t("featureDirectoryTitle"),
                desc: t("featureDirectoryDesc"),
              },
              {
                icon: Users,
                title: t("featureConnectionsTitle"),
                desc: t("featureConnectionsDesc"),
              },
              {
                icon: MessageCircle,
                title: t("featureMessagingTitle"),
                desc: t("featureMessagingDesc"),
              },
              {
                icon: Globe,
                title: t("featureMapTitle"),
                desc: t("featureMapDesc"),
              },
              {
                icon: Users,
                title: t("featureGroupsTitle"),
                desc: t("featureGroupsDesc"),
              },
              {
                icon: Shield,
                title: t("featureVerifiedTitle"),
                desc: t("featureVerifiedDesc"),
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="group rounded-2xl border border-border/50 bg-card p-6 transition-all hover:border-border hover:shadow-sm"
              >
                <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-muted">
                  <feature.icon className="h-5 w-5 text-foreground" />
                </div>
                <h3 className="text-lg font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="border-t border-border/50 bg-muted/50 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
            {[
              {
                value: t("statIndustriesValue"),
                label: t("statIndustriesLabel"),
              },
              {
                value: t("statSpecsValue"),
                label: t("statSpecsLabel"),
              },
              {
                value: t("statRealtimeValue"),
                label: t("statRealtimeLabel"),
              },
              {
                value: t("statGlobalValue"),
                label: t("statGlobalLabel"),
              },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl font-bold tracking-tight sm:text-4xl">
                  {stat.value}
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="border-t border-border/50 py-24 sm:py-32">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {t("howItWorksTitle")}
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              {t("howItWorksSubtitle")}
            </p>
          </div>

          <div className="mt-16 grid gap-12 sm:grid-cols-3 sm:gap-8">
            {[
              {
                step: "01",
                icon: UserPlus,
                title: t("step1Title"),
                desc: t("step1Desc"),
              },
              {
                step: "02",
                icon: CheckCircle,
                title: t("step2Title"),
                desc: t("step2Desc"),
              },
              {
                step: "03",
                icon: Handshake,
                title: t("step3Title"),
                desc: t("step3Desc"),
              },
            ].map((step, i) => (
              <div key={step.step} className="relative text-center">
                {/* Connector line (hidden on first and mobile) */}
                {i < 2 && (
                  <div className="absolute top-8 left-[calc(50%+2rem)] hidden h-px w-[calc(100%-4rem)] bg-border sm:block" />
                )}
                <div className="relative mx-auto mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-foreground text-background">
                  <step.icon className="h-7 w-7" />
                </div>
                <div className="mb-2 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                  {t("stepLabel")} {step.step}
                </div>
                <h3 className="text-lg font-semibold">{step.title}</h3>
                <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="relative overflow-hidden border-t border-border/50 py-24 sm:py-32">
        {/* Background decoration */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute right-0 bottom-0 h-[300px] w-[300px] rounded-full bg-chart-1/5 blur-3xl" />
          <div className="absolute top-0 left-0 h-[300px] w-[300px] rounded-full bg-chart-3/5 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {t("ctaTitle")}
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              {t("ctaSubtitle")}
            </p>
            <div className="mt-10">
              <Link
                href="/signup"
                className="group inline-flex h-12 items-center justify-center gap-2 rounded-full bg-foreground px-8 text-base font-medium text-background transition-all hover:bg-foreground/90"
              >
                {t("ctaButton")}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8">
        <div className="mx-auto max-w-6xl px-4 text-center text-sm text-muted-foreground sm:px-6">
          <p>{t("footerText")}</p>
        </div>
      </footer>
    </div>
  );
}
