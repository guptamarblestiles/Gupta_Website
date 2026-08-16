"use client";

import { Suspense, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, RoundedBox } from "@react-three/drei";
import type { Mesh } from "three";

type MarbleSlabProps = {
  /** Freezes rotation/bob for prefers-reduced-motion — the slab still
   *  renders, it just doesn't move. */
  animate: boolean;
};

/**
 * The rotating marble slab itself. Uses a physically-based material tuned
 * for a polished-stone look (low roughness + clearcoat) as a placeholder —
 * swap `color`/`roughness` for a real marble texture map (see brief section
 * 20-23, Supabase Storage) once production assets exist.
 */
function MarbleSlab({ animate }: MarbleSlabProps) {
  const meshRef = useRef<Mesh>(null);
  const startTime = useRef<number | null>(null);

  useFrame((state) => {
    if (!meshRef.current || !animate) return;
    if (startTime.current === null) startTime.current = state.clock.elapsedTime;
    const t = state.clock.elapsedTime - startTime.current;

    // Slow continuous rotation — one full turn roughly every 40s.
    meshRef.current.rotation.y = t * 0.16;
    // Subtle floating bob.
    meshRef.current.position.y = Math.sin(t * 0.6) * 0.08;
  });

  return (
    <RoundedBox ref={meshRef} args={[2.4, 3, 0.18]} radius={0.03} smoothness={4}>
      <meshPhysicalMaterial
        color="#e8e2d8"
        roughness={0.25}
        metalness={0.05}
        clearcoat={0.6}
        clearcoatRoughness={0.2}
      />
    </RoundedBox>
  );
}

/**
 * Hand-built lighting rig instead of drei's <Environment> — that component
 * fetches an HDR image from an external CDN at runtime in every visitor's
 * browser, which is an avoidable production dependency (CDN latency/outage
 * would visibly delay or break the hero). This rig gets a comparable
 * cinematic result with zero network requests.
 *
 * `lowPoly` drops the shadow-casting spotlight to a cheaper non-shadow
 * light and lowers intensity — used on tablet, where the full desktop rig
 * is unnecessary GPU cost for a smaller viewport.
 */
function SceneLighting({ lowPoly }: { lowPoly: boolean }) {
  return (
    <>
      {/* Cinematic key light, warm-tinted per brief's copper accent */}
      <spotLight
        position={[3, 4, 5]}
        angle={0.35}
        penumbra={0.8}
        intensity={lowPoly ? 5 : 8}
        color="#e6a166"
        castShadow={!lowPoly}
      />
      {/* Cool rim light for separation from the dark background */}
      {!lowPoly && (
        <spotLight position={[-4, 2, -3]} angle={0.5} penumbra={1} intensity={3} color="#8ea2c9" />
      )}
      {/* Soft fill so the shadowed face doesn't crush to black */}
      <pointLight position={[0, -1, 4]} intensity={1.2} color="#ffffff" />
      <ambientLight intensity={lowPoly ? 0.4 : 0.25} />
    </>
  );
}

type Hero3DTileProps = {
  /** Tablet gets a cheaper lighting rig (no shadow-casting light, no rim
   *  light, no ContactShadows blur pass) — reduced GPU cost, not reduced
   *  motion. Defaults to the full desktop rig. */
  lowPoly?: boolean;
  /** prefers-reduced-motion: keep the canvas but stop all animation. */
  reduceMotion?: boolean;
};

/**
 * The actual R3F canvas. This module is heavy (three.js + fiber + drei) and
 * must only ever be loaded via Hero3DTileLoader's dynamic(..., {ssr:false}),
 * never imported directly into a page — see that file for why. Mobile never
 * imports this module at all; Hero3DTileLoader renders StaticHeroTile
 * instead so three.js/R3F/drei never ship to phones.
 */
export default function Hero3DTile({ lowPoly = false, reduceMotion = false }: Hero3DTileProps) {
  return (
    <Canvas
      camera={{ position: [0, 0, 5.5], fov: 35 }}
      dpr={lowPoly ? [1, 1] : [1, 1.5]}
      gl={{ antialias: !lowPoly, alpha: true }}
      shadows={!lowPoly}
    >
      <SceneLighting lowPoly={lowPoly} />
      <Suspense fallback={null}>
        <MarbleSlab animate={!reduceMotion} />
        {!lowPoly && (
          <ContactShadows position={[0, -1.6, 0]} opacity={0.5} scale={8} blur={2.5} far={2} />
        )}
      </Suspense>
    </Canvas>
  );
}
