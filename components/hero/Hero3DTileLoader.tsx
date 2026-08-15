"use client";

import dynamic from "next/dynamic";

// The 3D scene (three.js + R3F + drei) is dynamically imported with
// ssr:false so it never blocks or bloats the initial server-rendered
// payload — per brief section 9: "must be dynamically imported so that the
// initial page load does not unnecessarily block rendering."
const Hero3DTile = dynamic(() => import("./Hero3DTile"), {
  ssr: false,
  loading: () => <TileFallback />,
});

function TileFallback() {
  return (
    <div className="w-full h-full flex items-center justify-center" aria-hidden="true">
      <div className="w-40 h-52 md:w-56 md:h-72 rounded-sm bg-gradient-to-br from-hero-surface to-hero-bg border border-hero-border animate-pulse" />
    </div>
  );
}

export function Hero3DTileLoader() {
  return (
    <div className="w-full h-full">
      <Hero3DTile />
    </div>
  );
}
