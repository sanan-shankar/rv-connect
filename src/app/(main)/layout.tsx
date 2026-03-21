import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/layout/navbar";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  // Fetch unread notification count
  const unreadCount = await prisma.notification.count({
    where: {
      userId: session.user.id,
      read: false,
    },
  });

  return (
    <div className="relative min-h-screen">
      {/* Fixed background image */}
      <div className="fixed inset-0 -z-10">
        <img
          src="/images/landing.jpeg"
          alt=""
          className="h-full w-full object-cover"
        />
        <div className="fixed inset-0 bg-[#F5F0E8]/65 backdrop-blur-[2px] dark:bg-black/65" />
      </div>
      <Navbar
        user={{
          id: session.user.id,
          name: session.user.name,
          email: session.user.email,
          role: session.user.role,
          avatarColor: session.user.avatarColor,
        }}
        unreadCount={unreadCount}
      />
      <main className="mx-auto max-w-7xl px-6 py-8 lg:px-8">{children}</main>
    </div>
  );
}
