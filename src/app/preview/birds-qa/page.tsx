import { BirdAvatar } from "@/components/common/bird-avatar";
import { BIRD_SPECIES_COUNT } from "@/lib/avatar";

/**
 * QA harness for the bird species set. Renders every species big with centering guides
 * (center cross + safe-area ring) so off-center / unbalanced birds are obvious, plus the
 * small sizes that actually ship (40 / 28) to check legibility. Neutral disc so shape is
 * the only variable. Not a product surface; a working tool for this session.
 */

const DISC = "#3E6E54";
const BIG = 132;

export default function BirdsQA() {
  const species = Array.from({ length: BIRD_SPECIES_COUNT }, (_, i) => i);
  return (
    <div style={{ minHeight: "100vh", background: "#ECEBE4", color: "#1E2420", padding: 28, fontFamily: "var(--font-body), system-ui" }}>
      <h1 style={{ fontFamily: "var(--font-display), serif", fontSize: 26, margin: 0 }}>Birds QA — {BIRD_SPECIES_COUNT} species</h1>
      <p style={{ color: "#6B726A", fontSize: 14, marginTop: 4 }}>
        Center cross + inner safe ring (mass should sit inside the ring, centered). Small sizes are the ship sizes.
      </p>

      <div
        style={{
          marginTop: 22,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(168px, 1fr))",
          gap: 18,
        }}
      >
        {species.map((i) => (
          <div key={i} style={{ background: "#FBFBF8", border: "1px solid #E4E1D7", borderRadius: 16, padding: 14, display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
            <div style={{ position: "relative", width: BIG, height: BIG }}>
              <BirdAvatar user={{ id: "qa", avatarSpecies: i, avatarColor: DISC }} size={BIG} />
              {/* centering guides */}
              <svg width={BIG} height={BIG} viewBox="0 0 132 132" style={{ position: "absolute", inset: 0, pointerEvents: "none" }} aria-hidden>
                <circle cx="66" cy="66" r="40" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="1" strokeDasharray="3 4" />
                <line x1="66" y1="18" x2="66" y2="114" stroke="rgba(255,255,255,0.35)" strokeWidth="0.75" />
                <line x1="18" y1="66" x2="114" y2="66" stroke="rgba(255,255,255,0.35)" strokeWidth="0.75" />
                <circle cx="66" cy="66" r="1.6" fill="rgba(255,255,255,0.8)" />
              </svg>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <BirdAvatar user={{ id: "qa", avatarSpecies: i, avatarColor: DISC }} size={40} />
              <BirdAvatar user={{ id: "qa", avatarSpecies: i, avatarColor: DISC }} size={28} />
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#6B726A" }}>#{i}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
