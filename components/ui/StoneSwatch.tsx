import { cn } from "@/lib/utils/cn";

export type StoneType =
  | "marble"
  | "granite"
  | "gvt"
  | "bathroom"
  | "onyx-honey"
  | "nero-marquina"
  | "verde-alpi"
  | "statuario";

/**
 * Layered-gradient placeholder standing in for real product photography.
 * Supabase Storage (brief section 23) isn't populated yet, so every
 * category/featured card needs *something* premium-looking rather than a
 * gray box — these are hand-tuned CSS gradients evoking each stone's real
 * veining/tone. Swap for <Image src={product.imageUrl} /> the moment real
 * WebP assets exist; the calling components already isolate this behind a
 * single prop so that swap touches one file, not every card.
 */
const STONE_BACKGROUNDS: Record<StoneType, string> = {
  marble:
    "repeating-linear-gradient(118deg, transparent 0px, transparent 14px, rgba(110,100,85,0.22) 15px, rgba(110,100,85,0.05) 17px, transparent 24px)," +
    "repeating-linear-gradient(25deg, transparent 0px, transparent 40px, rgba(184,115,51,0.08) 41px, transparent 46px)," +
    "linear-gradient(135deg, #f7f6f3 0%, #ece8e0 40%, #f9f8f5 60%, #e4dfd4 100%)",
  granite:
    "radial-gradient(circle at 18% 28%, rgba(15,15,18,0.65) 0, rgba(15,15,18,0.65) 4px, transparent 5px)," +
    "radial-gradient(circle at 68% 62%, rgba(90,90,96,0.55) 0, rgba(90,90,96,0.55) 3px, transparent 4px)," +
    "radial-gradient(circle at 42% 82%, rgba(10,10,12,0.6) 0, rgba(10,10,12,0.6) 3px, transparent 4px)," +
    "radial-gradient(circle at 85% 18%, rgba(100,100,106,0.5) 0, rgba(100,100,106,0.5) 3px, transparent 4px)," +
    "radial-gradient(circle at 30% 55%, rgba(80,80,86,0.5) 0, rgba(80,80,86,0.5) 2.5px, transparent 3.5px)," +
    "radial-gradient(circle at 58% 15%, rgba(15,15,18,0.55) 0, rgba(15,15,18,0.55) 3px, transparent 4px)," +
    "radial-gradient(circle at 78% 78%, rgba(95,95,100,0.5) 0, rgba(95,95,100,0.5) 3px, transparent 4px)," +
    "radial-gradient(circle at 10% 70%, rgba(20,20,24,0.5) 0, rgba(20,20,24,0.5) 2.5px, transparent 3.5px)," +
    "linear-gradient(160deg, #4d4d51 0%, #37373b 50%, #494950 100%)",
  gvt:
    "linear-gradient(112deg, rgba(255,255,255,0.75) 0%, rgba(255,255,255,0.15) 16%, transparent 32%)," +
    "radial-gradient(ellipse 60% 40% at 75% 75%, rgba(120,120,118,0.25) 0%, transparent 70%)," +
    "linear-gradient(150deg, #e2e2e0 0%, #c9c9c7 45%, #dadad8 70%, #bcbcba 100%)",
  bathroom:
    "repeating-linear-gradient(0deg, rgba(140,158,158,0.35) 0px, rgba(140,158,158,0.35) 1.5px, transparent 2px, transparent 72px)," +
    "repeating-linear-gradient(90deg, rgba(140,158,158,0.35) 0px, rgba(140,158,158,0.35) 1.5px, transparent 2px, transparent 72px)," +
    "linear-gradient(140deg, #f5f8f8 0%, #e8eeee 50%, #f1f5f5 100%)",
  "onyx-honey":
    "repeating-linear-gradient(100deg, rgba(255,255,255,0.08) 0px, transparent 6px, transparent 14px)," +
    "linear-gradient(125deg, #e8a94a 0%, #c9772b 35%, #a85a1f 65%, #8a4416 100%)",
  "nero-marquina":
    "repeating-linear-gradient(70deg, rgba(255,255,255,0.15) 0px, transparent 2px, transparent 22px, rgba(255,255,255,0.08) 24px)," +
    "repeating-linear-gradient(150deg, rgba(255,255,255,0.08) 0px, transparent 3px, transparent 30px)," +
    "linear-gradient(160deg, #1a1a1c 0%, #0d0d0f 100%)",
  "verde-alpi":
    "repeating-linear-gradient(105deg, rgba(255,255,255,0.06) 0px, transparent 4px, transparent 16px)," +
    "linear-gradient(135deg, #35594a 0%, #1e3d31 45%, #2c4d3f 70%, #16281f 100%)",
  statuario:
    "repeating-linear-gradient(95deg, rgba(184,115,51,0.15) 0px, transparent 3px, transparent 40px, rgba(120,120,110,0.1) 42px)," +
    "linear-gradient(135deg, #fbfaf7 0%, #f1efe9 50%, #f8f6f1 100%)",
};

type StoneSwatchProps = {
  stone: StoneType;
  className?: string;
};

export function StoneSwatch({ stone, className }: StoneSwatchProps) {
  return (
    <div
      aria-hidden="true"
      className={cn("relative overflow-hidden", className)}
      style={{ backgroundImage: STONE_BACKGROUNDS[stone] }}
    />
  );
}
