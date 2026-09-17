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

/**
 * How far the hoopoe should look along a field that is filling up, clamped to
 * the [-1, 1] the controller accepts.
 *
 * `over` is the length at which the gaze reaches the far end -- roughly how
 * long an answer that field expects, so an email (22) sweeps more slowly than
 * a password (16). Seven forms wrote this expression out; the signup form
 * already had it as a helper and the other six did not, which is why some of
 * them clamp against a number nobody chose.
 */
export const gazeFor = (len: number, over: number) =>
  Math.max(-1, Math.min(1, (len / over) * 2 - 1));

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
      legsDown: v("legsDown"),
      perch: p("perch"),
      turn: p("turn"),
      point: p("point"),
      wave: p("wave"),
      nod: p("nod"),
      shake: p("shake"),
      crest: p("crest"),
      crestFlick: p("crestFlick"),
      preen: p("preen"),
      peck: p("peck"),
      flyIn: p("flyIn"),
      express: p("express"),
      celebrate: p("celebrate"),
      blinkOnce: p("blinkOnce"),
      gaze: v("gaze"),
      coverEyes: v("coverEyes"),
      peek: v("peek"),
      sleep: p("sleep"),
      wake: p("wake"),
      poke: v("poke"),
      sequence: p("sequence") as HoopoeApi["sequence"],
      react: p("react"),
      stop: v("stop"),
      cancel: v("cancel"),
      rest: p("rest"),
      isBusy: (() => ref.current?.isBusy() ?? false) as HoopoeApi["isBusy"],
    };
  }, []);
}
