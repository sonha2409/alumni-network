import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/server";
import { getProfileWithIndustry } from "@/lib/queries/profiles";

interface ProfilePageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: ProfilePageProps): Promise<Metadata> {
  const { id } = await params;
  const profile = await getProfileWithIndustry(id);

  if (!profile) {
    return { title: "Profile Not Found — AlumNet" };
  }

  return {
    title: `${profile.full_name} — AlumNet`,
    description: `${profile.full_name}, Class of ${profile.graduation_year} — ${profile.primary_industry.name}`,
  };
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const profile = await getProfileWithIndustry(id);

  if (!profile) {
    notFound();
  }

  const isOwnProfile = user?.id === profile.user_id;

  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            {/* Avatar */}
            {profile.photo_url ? (
              <Image
                src={profile.photo_url}
                alt={profile.full_name}
                width={96}
                height={96}
                className="h-24 w-24 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-muted text-2xl font-semibold text-muted-foreground">
                {profile.full_name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
            )}

            <div className="flex-1">
              <h1 className="text-2xl font-bold">{profile.full_name}</h1>
              <p className="text-muted-foreground">
                Class of {profile.graduation_year}
              </p>
              <p className="mt-1 text-sm">
                {profile.primary_industry.name}
                {profile.primary_specialization &&
                  ` · ${profile.primary_specialization.name}`}
              </p>
              {(profile.city || profile.state_province || profile.country) && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {[profile.city, profile.state_province, profile.country]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              )}
            </div>

            {isOwnProfile && (
              <Link href="/profile/edit">
                <Button variant="outline" size="sm">
                  Edit profile
                </Button>
              </Link>
            )}
          </div>
        </CardHeader>

        <CardContent className="flex flex-col gap-6">
          {/* Bio */}
          {profile.bio && (
            <section>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                About
              </h2>
              <p className="whitespace-pre-line text-sm">{profile.bio}</p>
            </section>
          )}

          {/* Secondary Industry */}
          {profile.secondary_industry && (
            <>
              <Separator />
              <section>
                <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Also interested in
                </h2>
                <p className="text-sm">
                  {profile.secondary_industry.name}
                  {profile.secondary_specialization &&
                    ` · ${profile.secondary_specialization.name}`}
                </p>
              </section>
            </>
          )}

          {/* Placeholder sections for future features */}
          <Separator />
          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Career history
            </h2>
            <p className="text-sm text-muted-foreground">
              No career entries yet.
              {isOwnProfile && " This section will be available soon."}
            </p>
          </section>

          <Separator />
          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Education
            </h2>
            <p className="text-sm text-muted-foreground">
              No education entries yet.
              {isOwnProfile && " This section will be available soon."}
            </p>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
