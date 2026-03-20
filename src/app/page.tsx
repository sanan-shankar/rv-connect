import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="relative flex min-h-screen flex-col">
      {/* Full-screen hero with landing.jpeg */}
      <div className="absolute inset-0">
        <img
          src="/images/landing.jpeg"
          alt=""
          className="h-full w-full object-cover"
        />
        {/* Very subtle darkening — just enough for text readability */}
        <div className="absolute inset-0 bg-black/20" />
      </div>

      {/* Content — vertically centred, left-aligned */}
      <div className="relative z-10 flex min-h-screen items-center">
        <div className="mx-auto w-full max-w-7xl px-8 lg:px-16">
          <h1 className="font-heading text-4xl font-bold tracking-tight text-white drop-shadow-lg sm:text-5xl lg:text-6xl">
            Welcome back to the valley.
          </h1>
          <p className="mt-3 max-w-2xl text-lg text-white/90 drop-shadow-md sm:text-xl">
            A space for Rishi Valley alumni to reconnect, share stories, and find each other.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/signup"
              className="rounded-xl bg-white px-7 py-3 font-semibold text-gray-900 shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl"
            >
              Join the community
            </Link>
            <Link
              href="/login"
              className="rounded-xl border-2 border-white/70 px-7 py-3 font-semibold text-white backdrop-blur-sm transition-all hover:border-white hover:bg-white/10"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
