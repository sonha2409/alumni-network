import { Suspense } from "react";

import { VerificationBanner } from "./verification-banner";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      {/* Navbar will be added later */}
      <Suspense>
        <VerificationBanner />
      </Suspense>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
