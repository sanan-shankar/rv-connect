"use client";

/* ------------------------------------------------------------------ *
 *  Konami valley flush. A hidden easter egg ported from the
 *  /lab/eggs lab (KonamiDemo): type the Konami sequence
 *  anywhere in the authenticated shell and a small flock crosses the
 *  viewport while a few leaves drift down, then it clears.
 *
 *  Fixed full-screen overlay, pointer-events:none, so it never blocks
 *  clicks. Motion runs always (no reduced-motion gating). All animated
 *  values are finite numbers.
 * ------------------------------------------------------------------ */

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { BirdAvatar } from "@/components/common/bird-avatar";

const KONAMI = [
  "ArrowUp",
  "ArrowUp",
  "ArrowDown",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowLeft",
  "ArrowRight",
  "b",
  "a",
];

const FLUSH_BIRDS = ["k-pitta", "k-bee-eater", "k-roller", "k-hoopoe"];
const LEAVES = [0, 1, 2, 3, 4, 5, 6];

export function KonamiEggs() {
  const [flush, setFlush] = useState(0);
  const buf = useRef<string[]>([]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.isContentEditable)
      ) {
        return;
      }
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      buf.current = [...buf.current, k].slice(-KONAMI.length);
      if (
        buf.current.length === KONAMI.length &&
        KONAMI.every((v, i) => buf.current[i] === v)
      ) {
        buf.current = [];
        setFlush((f) => f + 1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (flush === 0) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[120] overflow-hidden"
    >
      {LEAVES.map((i) => (
        <motion.span
          key={`${flush}-leaf-${i}`}
          className="absolute top-0"
          style={{ left: `${6 + i * 13}%` }}
          initial={{ y: -18, opacity: 0, rotate: -20 }}
          animate={{
            y: 130,
            opacity: [0, 1, 1, 0],
            rotate: [-20, 14, -8, 10],
          }}
          transition={{
            duration: 2.1 + (i % 3) * 0.3,
            ease: "easeInOut",
            delay: i * 0.09,
          }}
        >
          <svg width="14" height="16" viewBox="0 0 14 16">
            <path
              d="M7 1 C12 5 12 12 7 15 C2 12 2 5 7 1 Z"
              fill="var(--primary)"
              opacity="0.85"
            />
            <line
              x1="7"
              y1="3"
              x2="7"
              y2="14"
              stroke="#fff"
              strokeOpacity="0.45"
              strokeWidth="0.8"
            />
          </svg>
        </motion.span>
      ))}
      {FLUSH_BIRDS.map((id, i) => (
        <motion.span
          key={`${flush}-${id}`}
          className="absolute left-0 top-[18%]"
          initial={{ x: -80, y: 12 + i * 17, opacity: 0 }}
          animate={{
            x: 520,
            y: -8 + i * 15,
            opacity: [0, 1, 1, 0],
          }}
          transition={{
            duration: 2 + i * 0.22,
            ease: "easeInOut",
            delay: i * 0.16,
          }}
        >
          <BirdAvatar user={{ id, name: "Flush" }} size={30} />
        </motion.span>
      ))}
    </div>
  );
}
