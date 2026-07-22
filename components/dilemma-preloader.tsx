"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const INTRO_KEY = "holders-dilemma-intro-seen";
const IMAGE_SRC = "/dilemma-preloader-hand.jpg";

type IntroStep = "incoming" | "image" | "choice" | "pill";

function safeSessionSet() {
  try {
    window.sessionStorage.setItem(INTRO_KEY, "1");
  } catch {
    // Storage can fail in privacy modes. The hard timeout still reveals the site.
  }
}

function safeSessionHasKey() {
  try {
    return window.sessionStorage.getItem(INTRO_KEY) === "1";
  } catch {
    return false;
  }
}

function safeSessionClearOnRefresh() {
  try {
    window.sessionStorage.removeItem(INTRO_KEY);
  } catch {
    // Ignore storage failures; the overlay is non-critical.
  }
}

export function DilemmaPreloader() {
  const [active, setActive] = useState(() => (typeof window === "undefined" ? true : !safeSessionHasKey()));
  const [step, setStep] = useState<IntroStep>("incoming");
  const finishedRef = useRef(false);

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    safeSessionSet();
    document.documentElement.classList.remove("dilemma-intro-active");
    setActive(false);
  }, []);

  useEffect(() => {
    if (!active) return;

    document.documentElement.classList.add("dilemma-intro-active");

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const schedule = reducedMotion
      ? [
          [360, "choice"],
          [880, "pill"],
          [1500, "finish"],
        ] as const
      : [
          [820, "image"],
          [1380, "choice"],
          [2180, "pill"],
          [3150, "finish"],
        ] as const;

    const timers = schedule.map(([delay, next]) =>
      window.setTimeout(() => {
        if (next === "finish") {
          finish();
          return;
        }
        setStep(next);
      }, delay),
    );

    const hardTimeout = window.setTimeout(finish, 4000);
    const clearOnFullUnload = () => safeSessionClearOnRefresh();
    window.addEventListener("beforeunload", clearOnFullUnload);

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      window.clearTimeout(hardTimeout);
      window.removeEventListener("beforeunload", clearOnFullUnload);
      document.documentElement.classList.remove("dilemma-intro-active");
    };
  }, [active, finish]);

  if (!active) return null;

  return (
    <div className={`dilemma-preloader is-${step}`} role="dialog" aria-modal="true" aria-label="Holders Dilemma intro">
      <button type="button" className="dilemma-preloader__skip" onClick={finish}>
        SKIP
      </button>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="dilemma-preloader__preload" src={IMAGE_SRC} alt="" aria-hidden="true" loading="eager" decoding="async" />

      <div className="dilemma-preloader__frame" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={IMAGE_SRC} alt="" />
      </div>

      <div className="dilemma-preloader__copy" aria-live="polite">
        {step === "incoming" ? <p>INCOMING DILEMMA...</p> : null}
        {step === "choice" ? <p>YOU HAVE A CHOICE.</p> : null}
        {step === "pill" ? (
          <p className="dilemma-preloader__decision">
            <span>HOLD</span>
            <em>OR</em>
            <span>JEET</span>
          </p>
        ) : null}
      </div>
    </div>
  );
}
