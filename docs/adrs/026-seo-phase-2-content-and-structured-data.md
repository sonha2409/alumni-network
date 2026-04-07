# ADR-026: SEO Phase 2 — Content Pages, Bilingual Metadata, Structured Data

**Status**: Accepted
**Date**: 2026-04-07
**Deciders**: Son Ha
**Related**: ADR-024 (indigo theme), SPEC.md F43, SPEC.md F46

## Context

F43 shipped the technical SEO baseline (robots.txt, sitemap, basic metadata, Organization JSON-LD). After Google Search Console was verified on 2026-04-07, two gaps became visible:

1. **Thin indexable surface** — only three URLs were reachable by Googlebot (`/`, `/login`, `/signup`). Login and signup are noindex-worthy. That left the homepage as the *only* meaningful page for Google to rank, which caps how much search traffic the site can attract.
2. **Brand inconsistency** — the codebase called the product "AlumNet" in translations and the landing page hero, but "PTNKAlum" in metadata. Google's cached homepage snippet showed "AlumNet — Alumni Network", which is both generic (won't rank for PTNK-specific queries) and inconsistent with the canonical brand.
3. **Broken sitemap ingestion** — the proxy matcher was intercepting `/sitemap.xml`, returning HTML, and Search Console reported "Sitemap is HTML". Fixed in commit `aa37827` before F46 implementation began.
4. **Single-language metadata** — meta tags and page copy were English-only despite the target audience being predominantly Vietnamese alumni searching for `cựu học sinh PTNK`, `Phổ thông Năng khiếu`, etc.

## Decision

Ship **F46 (SEO Phase 2)** as a single feature addressing all four gaps simultaneously, scoped as the "Option C" variant from the F46 planning conversation:

1. **Brand unification** — rename all user-visible "AlumNet" strings to "PTNKAlum" in `messages/en.json` and `messages/vi.json` (40 hits). Internal strings (email templates, geocoding User-Agent) left unchanged; they're not SEO-visible and renaming them is outside the feature's scope.
2. **Content pages** — net-new public routes `/about` and `/faq` that double the indexable surface and give Google real content to rank. Both are Server Components with bilingual copy via `next-intl`, reachable from the landing page via the shared `<PublicFooter>`.
3. **Structured data catalog**:
   - Landing: enriched `Organization` (adds `alternateName`, `parentOrganization` → `EducationalOrganization` for the school with `foundingDate: 1996`, `contactPoint`, address) + `WebSite` schema
   - `/about`: `BreadcrumbList`
   - `/faq`: `FAQPage` (the biggest SEO win — Google renders Q&As directly in search results) + `BreadcrumbList`
4. **Bilingual SEO** — root `generateMetadata()` reads from a new `seo` translation namespace so titles/descriptions render in the user's locale. Keywords array includes both English ("PTNK alumni network") and Vietnamese ("cựu học sinh PTNK", "mạng lưới cựu học sinh PTNK") phrases so query matching works across languages even though a single URL serves both.
5. **Noindex hardening** — each authenticated route group layout (`(auth)`, `(main)`, `(admin)`) exports `robots: { index: false, follow: false }` as a belt-and-braces measure in case robots.txt is ignored.
6. **Dynamic OG image** — `src/app/opengraph-image.tsx` generates a 1200×630 image via `next/og` `ImageResponse`, indigo gradient matching F44 theme, bilingual tagline. Used as the default OG image sitewide.
7. **Google verification meta tag** — added as a backup method alongside the DNS TXT record already in Cloudflare.

## Alternatives Considered

### A. Technical-only gap fill (minimal)
Just add the OG image, per-page noindex metadata, and WebSite schema. No content pages. No bilingual metadata.

**Rejected** because the real ceiling on search traffic is the number of indexable URLs, not the quality of the 3 existing pages' tags. Tagging nothing better doesn't help if there's nothing to rank.

### B. URL-based i18n (`/en/about`, `/vi/about`)
Switch from the current cookie-based `next-intl` setup to the routing-based variant so Google sees two separate URLs per page and `hreflang` becomes meaningful.

**Rejected** for now. This is a repo-wide refactor (proxy, nav, every `Link`, sitemap structure) and blocks F46 for days. The Vietnamese keywords inside the English default render get us most of the benefit with 2% of the effort. Logged as a Phase 3 candidate if Vietnamese traffic plateaus.

### C. Blog / long-form content
Create a `/blog` route, write 5-10 posts about alumni stories, PTNK events, career tips.

**Rejected** for this feature. Content production is a different workflow (needs editorial voice, publishing schedule, CMS considerations) and deserves its own feature with its own scope. F46 establishes the infrastructure that a future blog would plug into (shared footer, metadata patterns, proxy allow-list structure).

### D. Split F46 into multiple commits
Separate commits for brand rename, content pages, metadata, structured data.

**Rejected** for pragmatic reasons (conversation context budget at 71% at decision time, commit overhead not worth it for a cohesive feature). One `feat:` commit landed, rollback is still a single `git revert`.

## Consequences

### Positive

- **5 indexable URLs instead of 3** — and the new two (`/about`, `/faq`) are content-rich rather than transactional.
- **FAQPage rich results** eligible — Google can render the 10 Q&As as expandable blocks directly in search results, taking more SERP real estate than a standard blue link.
- **Vietnamese query coverage** — meta keywords + in-content phrases match the actual queries Vietnamese PTNK alumni Google (`cựu học sinh PTNK`, etc.).
- **Brand consistency** — Google will re-crawl and replace the stale "AlumNet — Alumni Network" snippet with "PTNKAlum — Mạng lưới cựu học sinh…" over the next days/weeks.
- **Authenticated routes triple-protected** against indexing — robots.txt disallows, layout metadata sets `robots: noindex`, and the proxy redirects non-authenticated requests away from them anyway.

### Negative

- **Translation surface area grew** — `en.json` and `vi.json` each gained four new top-level namespaces (`seo`, `publicFooter`, `about`, `faq`) totaling ~80 new keys. Future content edits must update both files.
- **Landing page became dynamic** — previously statically rendered, now server-rendered per request because `generateMetadata()` reads translations. LCP impact is negligible (metadata is tiny), but the Vercel build output changes.
- **No URL-based locale means `hreflang` has limited value** — the `languages: { en: "/", vi: "/" }` declaration is honest about the current state (same URL for both locales) but doesn't give Google as strong a signal as separate URLs would.
- **OG image uses system fallback font** — Vietnamese diacritics render acceptably with the default sans-serif in `ImageResponse`, but for pixel-perfect typography we'd need to fetch Be Vietnam Pro at edge runtime. Deferred as a future polish task.
- **Contact email routing not yet operational** — `contact@ptnkalum.com` is advertised on `/about` and in the `Organization` JSON-LD, but inbound email routing is not configured. Separate follow-up task.

### Follow-up tasks

1. Set up `contact@ptnkalum.com` — recommended: Cloudflare Email Routing (free, forwards to personal inbox) or Resend inbound (already a project dependency).
2. After Vercel deploy, re-submit sitemap in Search Console and request indexing for `/about` and `/faq` individually.
3. Validate FAQPage JSON-LD via Google Rich Results Test.
4. Verify OG image on production via Facebook Sharing Debugger and Twitter Card Validator.
5. Monitor Search Console "Performance" tab over the next 4 weeks for any Vietnamese query impressions.
6. Consider a future ADR for URL-based i18n if Vietnamese traffic underperforms.

## Implementation Notes

- Files touched: ~14 (see feature doc `seo-phase-2.md`)
- New tests: none (existing 67 Vitest tests still pass unchanged)
- Build impact: clean, no new warnings
- Context budget: implemented in a single session; single commit strategy chosen to conserve context budget for later L7 docs
