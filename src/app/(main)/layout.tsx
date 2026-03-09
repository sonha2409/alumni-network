import { Suspense } from "react";

import { MainNavbar } from "@/components/navbar/main-navbar";
import { VerificationBanner } from "./verification-banner";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <Suspense>
        <MainNavbar />
      </Suspense>
      <Suspense>
        <VerificationBanner />
      </Suspense>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
