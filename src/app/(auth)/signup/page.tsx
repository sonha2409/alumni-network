import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SignupForm } from "./signup-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.signup");
  return {
    title: t("title"),
    description: t("description"),
    robots: { index: false },
  };
}

export default async function SignupPage() {
  const t = await getTranslations("auth.signup");
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">{t("heading")}</CardTitle>
        <CardDescription>
          {t("subheading")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <SignupForm />
      </CardContent>
    </Card>
  );
}
