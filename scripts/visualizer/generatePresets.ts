/**
 * One-time generator for the visualizer's placeholder room images (see the
 * DEVIATION note in lib/visualizer/presets.ts for why these are generated
 * illustrations rather than sourced stock photos). Draws each preset's
 * zones as an SVG matching their configured quads exactly, then rasterizes
 * to JPEG. Re-run with `npx tsx scripts/visualizer/generatePresets.ts` if
 * presets.ts corner coordinates change.
 */
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { VISUALIZER_PRESETS, type Point } from "../../lib/visualizer/presets";

const OUT_DIR = join(process.cwd(), "public", "visualizer");
mkdirSync(OUT_DIR, { recursive: true });

const THEME: Record<string, { sky: string; floor: string; wall: string; accent: string }> = {
  Floor: { sky: "#2b2622", floor: "#4a3d33", wall: "#3a332c", accent: "#6b5a48" },
  Wall: { sky: "#e8e2d8", floor: "#c9c0b2", wall: "#d8cfc0", accent: "#a89c8a" },
  Bathroom: { sky: "#dce8ea", floor: "#b8ccd0", wall: "#eef4f5", accent: "#8fa8ac" },
  Parking: { sky: "#87929c", floor: "#4d5257", wall: "#5c6166", accent: "#3a3e42" },
  Lawn: { sky: "#a9d3e8", floor: "#4a7c3f", wall: "#a9d3e8", accent: "#365c2e" },
  "Drawing Room": { sky: "#3a2f28", floor: "#6b4c3a", wall: "#4a3a2e", accent: "#8a6a4f" },
};

function quadPath(corners: [Point, Point, Point, Point]): string {
  return `M ${corners[0].x} ${corners[0].y} L ${corners[1].x} ${corners[1].y} L ${corners[2].x} ${corners[2].y} L ${corners[3].x} ${corners[3].y} Z`;
}

async function main() {
  for (const preset of VISUALIZER_PRESETS) {
    const theme = THEME[preset.spaceType];
    const { imageWidth: w, imageHeight: h, zones } = preset;

    const zonePaths = zones
      .map(
        (zone) =>
          `<path d="${quadPath(zone.corners)}" fill="${zone.kind === "floor" ? theme.floor : theme.wall}" stroke="${theme.accent}" stroke-width="3" />`,
      )
      .join("\n");

    const svg = `
      <svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
        <rect width="${w}" height="${h}" fill="${theme.sky}" />
        ${zonePaths}
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
