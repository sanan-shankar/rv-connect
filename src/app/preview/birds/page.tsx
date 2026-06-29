import { BirdAvatar } from "@/components/common/bird-avatar";
import { AVATAR_PALETTE, BIRD_SPECIES_COUNT, birdFor } from "@/lib/avatar";

const NAMES = [
  "Ananya Rao", "Karthik Menon", "Sanjana Pillai", "Dhruv Varma", "Meera Iyer", "Rohan Das",
  "Aisha Khan", "Vivek Nair", "Tara Joshi", "Imran Sheikh", "Priya Reddy", "Arjun Mehta",
  "Nila Krishnan", "Sahil Gupta", "Diya Patel", "Kabir Singh", "Leela Mani", "Yusuf Ali",
  "Ravi Shankar", "Anita Desai", "Gautam Rao", "Maya Pillai", "Zoya Khan", "Nikhil Verma",
  "Riya Bose", "Aditya Kar", "Sneha Roy", "Vikram Sen", "Pooja Nair", "Amit Shah",
  "Kiran Bedi", "Neha Jain", "Suresh Iyer", "Lakshmi Rao", "Manish Gill", "Esha Dutta",
  "Farhan Khan", "Ira Menon", "Om Prakash", "Uma Devi", "Raj Malhotra", "Sara Thomas",
  "Hari Kumar", "Bina Shah", "Dev Anand", "Mira Nair", "Asha Rao", "Vijay Kak",
];

export default function BirdGrid() {
  const counts = new Array(BIRD_SPECIES_COUNT).fill(0);
  const colorCounts = new Array(AVATAR_PALETTE.length).fill(0);
  for (let i = 0; i < 600; i++) {
    const b = birdFor("member-" + i);
    counts[b.species]++;
    colorCounts[b.colorIndex]++;
  }

  return (
    <div className="min-h-screen bg-background p-10 text-foreground">
      <h1 className="font-heading text-2xl tracking-tight">Valley birds</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Deterministic from id, photo upload overrides. {BIRD_SPECIES_COUNT} species x{" "}
        {AVATAR_PALETTE.length} colours x 4 poses.
      </p>

      <h2 className="mt-8 font-heading text-lg">Species (each colour)</h2>
      <div className="mt-3 flex flex-col gap-3">
        {Array.from({ length: BIRD_SPECIES_COUNT }).map((_, s) => (
          <div key={s} className="flex items-center gap-2">
            {AVATAR_PALETTE.map((c) => (
              <BirdAvatar key={c} user={{ id: "x", avatarSpecies: s, avatarColor: c }} size="sm" />
            ))}
          </div>
        ))}
      </div>

      <h2 className="mt-8 font-heading text-lg">Sample members (by name)</h2>
      <div className="mt-3 flex flex-wrap gap-3">
        {NAMES.map((n, i) => (
          <div key={i} className="flex w-[150px] items-center gap-2.5">
            <BirdAvatar user={{ id: "seed-" + n, name: n }} size="sm" />
            <span className="truncate text-[13px]">{n}</span>
          </div>
        ))}
      </div>

      <h2 className="mt-8 font-heading text-lg">Sizes + ring</h2>
      <div className="mt-3 flex items-end gap-4">
        <BirdAvatar user={{ id: "seed-Ananya Rao", name: "Ananya Rao" }} size="xs" />
        <BirdAvatar user={{ id: "seed-Karthik Menon", name: "Karthik Menon" }} size="sm" />
        <BirdAvatar user={{ id: "seed-Meera Iyer", name: "Meera Iyer" }} size="md" />
        <div className="bg-card p-2">
          <BirdAvatar user={{ id: "seed-Dhruv Varma", name: "Dhruv Varma" }} size="lg" ring />
        </div>
      </div>

      <h2 className="mt-8 font-heading text-lg">Distribution over 600 ids</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        species: {counts.join(", ")} (even ~{Math.round(600 / BIRD_SPECIES_COUNT)} each)
      </p>
      <p className="text-sm text-muted-foreground">
        colours: {colorCounts.join(", ")} (even ~{Math.round(600 / AVATAR_PALETTE.length)} each)
      </p>
    </div>
  );
}
