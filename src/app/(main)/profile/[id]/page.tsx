import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";

import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/server";
import { getProfileWithIndustry } from "@/lib/queries/profiles";
import { getCareerEntriesWithIndustry } from "@/lib/queries/career-entries";
import { getEducationEntriesByProfileId } from "@/lib/queries/education-entries";
import { getAvailabilityTagsByProfileId } from "@/lib/queries/availability-tags";

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

  const [careerEntries, educationEntries, availabilityTags] = await Promise.all([
    getCareerEntriesWithIndustry(id),
    getEducationEntriesByProfileId(id),
    getAvailabilityTagsByProfileId(id),
  ]);

  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            {/* Avatar */}
            {profile.photo_url ? (
              <img
                src={profile.photo_url}
                alt={profile.full_name}
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

          {/* Availability Tags */}
          {availabilityTags.length > 0 && (
            <>
              <Separator />
              <section>
                <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Available for
                </h2>
                <div className="flex flex-wrap gap-2">
                  {availabilityTags.map((tag) => (
                    <span
                      key={tag.id}
                      className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              </section>
            </>
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

          {/* Career History */}
          <Separator />
          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Career history
            </h2>
            {careerEntries.length > 0 ? (
              <div className="flex flex-col gap-4">
                {careerEntries.map((entry) => (
                  <div key={entry.id} className="relative pl-4 border-l-2 border-muted">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{entry.job_title}</p>
                      {entry.is_current && (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                          Current
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{entry.company}</p>
                    {entry.industry && (
                      <p className="text-xs text-muted-foreground">
                        {entry.industry.name}
                        {entry.specialization && ` · ${entry.specialization.name}`}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {new Date(entry.start_date).toLocaleDateString("en-US", {
                        month: "short",
                        year: "numeric",
                      })}
                      {" — "}
                      {entry.is_current || !entry.end_date
                        ? "Present"
                        : new Date(entry.end_date).toLocaleDateString("en-US", {
                            month: "short",
                            year: "numeric",
                          })}
                    </p>
                    {entry.description && (
                      <p className="mt-1 text-sm">{entry.description}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No career entries yet.
                {isOwnProfile && (
                  <>
                    {" "}
                    <Link href="/profile/edit" className="text-primary underline">
                      Add your work experience
                    </Link>
                  </>
                )}
              </p>
            )}
          </section>

          {/* Education */}
          <Separator />
          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Education
            </h2>
            {educationEntries.length > 0 ? (
              <div className="flex flex-col gap-3">
                {educationEntries.map((entry) => (
                  <div key={entry.id}>
                    <p className="text-sm font-medium">{entry.institution}</p>
                    {(entry.degree || entry.field_of_study) && (
                      <p className="text-sm text-muted-foreground">
                        {[entry.degree, entry.field_of_study]
                          .filter(Boolean)
                          .join(" in ")}
                      </p>
                    )}
                    {(entry.start_year || entry.end_year) && (
                      <p className="text-xs text-muted-foreground">
                        {entry.start_year && entry.end_year
                          ? `${entry.start_year} — ${entry.end_year}`
                          : entry.start_year
                            ? `${entry.start_year} — Present`
                            : `${entry.end_year}`}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No education entries yet.
                {isOwnProfile && (
                  <>
                    {" "}
                    <Link href="/profile/edit" className="text-primary underline">
                      Add your education
                    </Link>
                  </>
                )}
              </p>
            )}
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
