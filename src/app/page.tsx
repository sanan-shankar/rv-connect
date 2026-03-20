import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Hero Section */}
      <section
        className="relative flex flex-1 items-center"
        style={{
          background:
            "linear-gradient(135deg, #2D3A2B 0%, #4A6741 40%, #6B8F61 70%, #8B6F47 100%)",
        }}
      >
        <div className="mx-auto w-full max-w-5xl px-6 py-24 sm:px-8 lg:px-12">
          <h1 className="font-heading text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Welcome back to the valley.
          </h1>
          <p className="mt-4 max-w-xl text-lg text-white/80 sm:text-xl">
            A space for Rishi Valley alumni to reconnect, reminisce, and find
            each other.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/signup"
              className="rounded-xl bg-white px-6 py-3 font-semibold text-[#2D3A2B] shadow-md transition-all hover:scale-[1.02] hover:shadow-lg"
            >
              Join the community
            </Link>
            <Link
              href="/login"
              className="rounded-xl border-2 border-white/60 px-6 py-3 font-semibold text-white transition-all hover:border-white hover:bg-white/10"
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="bg-background py-16">
        <div className="mx-auto max-w-2xl px-6 text-center">
          {/* Leaf divider */}
          <div className="mb-8 flex items-center justify-center gap-3 text-leaf">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="opacity-60"
            >
              <path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66.95-2.3c.48.17.98.3 1.34.3C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75C7 8 17 8 17 8z" />
            </svg>
          </div>
          <p className="font-heading text-lg leading-relaxed text-foreground">
            Whether you walked the paths by the Rishi Valley river, spent
            evenings under the banyan tree, or remember the sound of the bell
            echoing across campus — this is your space.
          </p>
          <p className="mt-4 text-muted-foreground">
            Share stories, find old friends, and stay connected with the
            community that shaped you.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-8 text-center text-sm text-muted-foreground">
        Made with 🌿 for Rishi Valley School
      </footer>
    </div>
  );
}
