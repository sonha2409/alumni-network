export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-primary/5 via-background to-chart-4/5">
      {/* Decorative orbs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-24 h-[400px] w-[400px] rounded-full bg-primary/8 blur-3xl" />
        <div className="absolute -right-24 -bottom-24 h-[350px] w-[350px] rounded-full bg-chart-4/8 blur-3xl" />
      </div>
      <div className="relative w-full max-w-md px-4">{children}</div>
    </div>
  );
}
