"use client";

/* ------------------------------------------------------------------ *
 *  useHoopoe() — ergonomic wrapper around the <Hoopoe> imperative ref.
 *  Returns a stable `ref` to attach plus stable method wrappers that
 *  forward to the controller once mounted. Calls made before mount
 *  resolve harmlessly.
 *
 *    const h = useHoopoe();
 *    return <Hoopoe ref={h.ref} size={160} />;
 *    h.walk(3).then(() => h.point(btn)).then(() => h.celebrate());
 * ------------------------------------------------------------------ */

import { useMemo, useRef, type RefObject } from "react";
import type { HoopoeApi } from "./hoopoe-kit";

export type UseHoopoe = { ref: RefObject<HoopoeApi | null> } & HoopoeApi;

export function useHoopoe(): UseHoopoe {
  const ref = useRef<HoopoeApi | null>(null);

  return useMemo<UseHoopoe>(() => {
    // a verb that returns a Promise<void>
    const p =
      <K extends keyof HoopoeApi>(name: K) =>
      (...args: unknown[]): Promise<void> => {
        const fn = ref.current?.[name] as ((...a: unknown[]) => Promise<void>) | undefined;
        return fn ? fn.apply(ref.current, args) : Promise.resolve();
      };
    // a verb that returns void
    const v =
      <K extends keyof HoopoeApi>(name: K) =>
      (...args: unknown[]): void => {
        const fn = ref.current?.[name] as ((...a: unknown[]) => void) | undefined;
        fn?.apply(ref.current, args);
      };

    return {
      ref,
      walk: p("walk"),
      hop: p("hop"),
      flyTo: p("flyTo"),
      land: p("land"),
      takeOff: p("takeOff"),
      glide: v("glide"),
      perch: p("perch"),
      turn: p("turn"),
      point: p("point"),
      wave: p("wave"),
      nod: p("nod"),
      shake: p("shake"),
      crest: p("crest"),
      crestFlick: p("crestFlick"),
      express: p("express"),
      celebrate: p("celebrate"),
      blinkOnce: p("blinkOnce"),
      gaze: v("gaze"),
      bindPassword: ((getRevealed: () => boolean) => ref.current?.bindPassword(getRevealed) ?? (() => {})) as HoopoeApi["bindPassword"],
      coverEyes: v("coverEyes"),
      peek: v("peek"),
      sequence: p("sequence") as HoopoeApi["sequence"],
      react: p("react"),
      stop: v("stop"),
      cancel: v("cancel"),
      rest: p("rest"),
      isBusy: (() => ref.current?.isBusy() ?? false) as HoopoeApi["isBusy"],
    };
  }, []);
}
