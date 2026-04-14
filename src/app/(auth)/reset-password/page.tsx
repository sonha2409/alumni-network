import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ResetPasswordForm } from "./reset-password-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.resetPassword");
  return {
    title: t("title"),
    description: t("description"),
    alternates: { canonical: "/reset-password" },
    robots: { index: false },
  };
}

export default async function ResetPasswordPage() {
  const t = await getTranslations("auth.resetPassword");
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">{t("heading")}</CardTitle>
        <CardDescription>
          {t("subheading")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResetPasswordForm />
      </CardContent>
    </Card>
  );
}
