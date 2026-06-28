export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Neutral full-bleed wrapper. Each auth page owns its own layout:
  // login is a photo-split; signup/onboarding center their own card.
  return <div className="min-h-screen bg-background">{children}</div>;
}
