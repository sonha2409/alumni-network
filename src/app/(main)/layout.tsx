import { Suspense } from "react";

import { MainNavbar } from "@/components/navbar/main-navbar";
import { VerificationBanner } from "./verification-banner";
import { AnnouncementBanner } from "./announcement-banner";
import { StalenessBanner } from "./staleness-banner";
import { NotificationsWrapper } from "./notifications-wrapper";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <Suspense>
        <NotificationsWrapper>
          <Suspense>
            <MainNavbar />
          </Suspense>
          <Suspense>
            <VerificationBanner />
          </Suspense>
          <Suspense>
            <AnnouncementBanner />
          </Suspense>
          <Suspense>
            <StalenessBanner />
          </Suspense>
          <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            {children}
          </main>
        </NotificationsWrapper>
      </Suspense>
    </div>
  );
}
