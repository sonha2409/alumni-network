import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://ptnkalum.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/dashboard",
          "/directory",
          "/messages",
          "/connections",
          "/groups",
          "/settings",
          "/admin",
          "/moderation",
          "/onboarding",
          "/verification",
          "/reset-password",
          "/account-deleted",
          "/banned",
          "/api/",
          "/auth/",
          "/notifications",
          "/profile",
          "/map",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
