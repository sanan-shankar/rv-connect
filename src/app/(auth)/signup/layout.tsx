import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Join",
};

export default function SignupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
