import Link from "next/link";
import { getTranslations } from "next-intl/server";

/**
 * F46: Shared footer for public (unauthenticated) pages — landing, /about, /faq.
 * Keeps internal links consistent across indexable pages so Google can discover
 * /about and /faq from the landing page.
 */
export async function PublicFooter() {
  const t = await getTranslations("publicFooter");

  return (
    <footer className="border-t border-border/40 py-10">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:justify-between sm:text-left">
          <div>
            <p className="text-sm font-semibold tracking-tight">PTNKAlum</p>
            <p className="mt-1 text-xs text-muted-foreground">{t("tagline")}</p>
          </div>
          <nav
            aria-label="Footer"
            className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground"
          >
            <Link
              href="/about"
              className="transition-colors hover:text-foreground"
            >
              {t("about")}
            </Link>
            <Link
              href="/faq"
              className="transition-colors hover:text-foreground"
            >
              {t("faq")}
            </Link>
            <Link
              href="/login"
              className="transition-colors hover:text-foreground"
            >
              {t("logIn")}
            </Link>
            <Link
              href="/signup"
              className="transition-colors hover:text-foreground"
            >
              {t("signUp")}
            </Link>
          </nav>
        </div>
        <p className="mt-8 text-center text-xs text-muted-foreground">
          {t("copyright")}
        </p>
      </div>
    </footer>
  );
}
