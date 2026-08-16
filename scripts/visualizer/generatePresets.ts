/**
 * One-time generator for the visualizer's placeholder room images (see the
 * DEVIATION note in lib/visualizer/presets.ts for why these are generated
 * illustrations rather than sourced stock photos). Draws each preset as an
 * SVG matching its configured quad exactly, then rasterizes to JPEG.
 * Re-run with `npx tsx scripts/visualizer/generatePresets.ts` if presets.ts
 * corner coordinates change.
 */
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { VISUALIZER_PRESETS, type Point } from "../../lib/visualizer/presets";

const OUT_DIR = join(process.cwd(), "public", "visualizer");
mkdirSync(OUT_DIR, { recursive: true });

const THEME: Record<string, { sky: string; ground: string; accent: string }> = {
  Floor: { sky: "#2b2622", ground: "#4a3d33", accent: "#6b5a48" },
  Wall: { sky: "#e8e2d8", ground: "#c9c0b2", accent: "#a89c8a" },
  Bathroom: { sky: "#dce8ea", ground: "#b8ccd0", accent: "#8fa8ac" },
  Parking: { sky: "#87929c", ground: "#4d5257", accent: "#3a3e42" },
  Lawn: { sky: "#a9d3e8", ground: "#4a7c3f", accent: "#365c2e" },
  "Drawing Room": { sky: "#3a2f28", ground: "#6b4c3a", accent: "#8a6a4f" },
};

function quadPath(corners: [Point, Point, Point, Point]): string {
  return `M ${corners[0].x} ${corners[0].y} L ${corners[1].x} ${corners[1].y} L ${corners[2].x} ${corners[2].y} L ${corners[3].x} ${corners[3].y} Z`;
}

async function main() {
  for (const preset of VISUALIZER_PRESETS) {
    const theme = THEME[preset.spaceType];
    const { imageWidth: w, imageHeight: h, corners } = preset;

    const svg = `
      <svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
        <rect width="${w}" height="${h}" fill="${theme.sky}" />
        <path d="${quadPath(corners)}" fill="${theme.ground}" stroke="${theme.accent}" stroke-width="3" />
        <text x="${w / 2}" y="40" font-family="sans-serif" font-size="28" fill="${theme.accent}" text-anchor="middle" opacity="0.7">
          ${preset.label} (placeholder)
        </text>
      </svg>
    `;

    const outPath = join(OUT_DIR, `${preset.id}.jpg`);
    await sharp(Buffer.from(svg)).jpeg({ quality: 85 }).toFile(outPath);
    console.log(`wrote ${outPath}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
