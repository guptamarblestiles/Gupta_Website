"use client";

import { useRef, useState } from "react";
import { motion, useAnimationFrame, useMotionValue, useReducedMotion } from "framer-motion";

type Tile3DProps = {
  imageUrl: string;
};

/**
 * Small architectural 3D element for the Applications section: a single
 * tile panel with a visible edge (depth) and a soft shadow, idly rotating
 * and pausing while the user drags it to inspect another angle. Plain CSS
 * 3D transforms (perspective + rotateY on one motion value driven by a
 * single rAF loop) — not WebGL, per the brief's own preference for a
 * performant CSS/Framer implementation. Idle rotation and drag both write
 * to the same motion value, so there's no jump handing off between them.
 *
 * Reduced-motion users get the panel with no idle rotation (drag still
 * works — that's user-initiated, not autoplay).
 */
export function Tile3D({ imageUrl }: Tile3DProps) {
  const rotateY = useMotionValue(-18);
  const [isDragging, setIsDragging] = useState(false);
  const reduceMotion = useReducedMotion();
  const draggingRef = useRef(false);

  useAnimationFrame((_, delta) => {
    if (reduceMotion || draggingRef.current) return;
    rotateY.set(rotateY.get() + delta * 0.012);
  });

  return (
    <div
      className="hidden lg:flex items-center justify-center"
      style={{ perspective: 1200 }}
      aria-hidden="true"
    >
      <motion.div
        drag="x"
        dragElastic={0.15}
        dragConstraints={{ left: 0, right: 0 }}
        dragMomentum={false}
        onDragStart={() => {
          draggingRef.current = true;
          setIsDragging(true);
        }}
        onDrag={(_, info) => rotateY.set(rotateY.get() + info.delta.x * 0.3)}
        onDragEnd={() => {
          draggingRef.current = false;
          setIsDragging(false);
        }}
        style={{ rotateY, transformStyle: "preserve-3d", width: 200, height: 260 }}
        className="relative cursor-grab active:cursor-grabbing drop-shadow-2xl"
      >
        {/* Face */}
        <div
          className="absolute inset-0 rounded-md bg-cover bg-center"
          style={{ backgroundImage: `url(${imageUrl})`, transform: "translateZ(10px)" }}
        />
        {/* Edge (gives the panel visible thickness) */}
        <div
          className="absolute inset-y-0 right-0 w-[20px] bg-zinc-400"
          style={{ transform: "rotateY(90deg) translateZ(10px)", transformOrigin: "right" }}
        />
        <div
          className="absolute inset-x-0 bottom-0 h-[20px] bg-zinc-500"
          style={{ transform: "rotateX(-90deg) translateZ(10px)", transformOrigin: "bottom" }}
        />
      </motion.div>
      {isDragging && (
        <span className="sr-only" role="status">
          Rotating tile preview
        </span>
      )}
    </div>
  );
}
