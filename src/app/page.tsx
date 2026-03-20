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
        {/* Spotify-style gradient fade — dark at bottom */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/20 to-black/80" />
      </div>

      {/* Content positioned at bottom of viewport */}
      <div className="relative z-10 flex min-h-screen flex-col justify-end">
        <div className="mx-auto w-full max-w-5xl px-6 pb-20 sm:px-8 lg:px-12">
          <h1 className="font-heading text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Welcome back to the valley.
          </h1>
          <p className="mt-3 max-w-lg text-lg text-white/80 sm:text-xl">
            A space for Rishi Valley alumni to reconnect, share stories, and
            find each other.
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
              className="rounded-xl border-2 border-white/50 px-7 py-3 font-semibold text-white backdrop-blur-sm transition-all hover:border-white hover:bg-white/10"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
