import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoginForm } from "./login-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.login");
  return {
    title: t("title"),
    description: t("description"),
    alternates: { canonical: "/login" },
    robots: { index: false },
  };
}

export default async function LoginPage() {
  const t = await getTranslations("auth.login");
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">{t("heading")}</CardTitle>
        <CardDescription>
          {t("subheading")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Suspense>
          <LoginForm />
        </Suspense>
      </CardContent>
    </Card>
  );
}
