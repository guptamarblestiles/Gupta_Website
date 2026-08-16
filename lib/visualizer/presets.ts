/**
 * Preset room "photos" for the /visualizer AR-lite tool, plus the 4 corner
 * points (in the image's own pixel space) that define the floor/wall plane
 * each tile texture gets warped onto — see lib/visualizer/homography.ts.
 *
 * DEVIATION FROM BRIEF: the brief asked for curated stock photos. Sourcing
 * real photos would mean either guessing image URLs (not allowed) or
 * downloading from a third-party stock site chosen unilaterally — and real
 * photos also require someone to eyeball-pick 4 corner points by hand,
 * which is exactly where this feature was flagged as highest-risk. These
 * are instead simple generated room illustrations (scripts/visualizer/
 * generatePresets.ts) where the quad corners are known exactly by
 * construction, so the homography math can be verified as correct
 * independent of corner-picking accuracy. Swap in real photos later by
 * replacing the image file and re-measuring corners — the config shape
 * doesn't change.
 *
 * Corner order is always [top-left, top-right, bottom-right, bottom-left]
 * of the target plane, matching lib/visualizer/homography.ts's expected
 * unit-square correspondence.
 */
export type SpaceType = "Floor" | "Wall" | "Bathroom" | "Parking" | "Lawn" | "Drawing Room";

export type Point = { x: number; y: number };

export type VisualizerPreset = {
  id: string;
  spaceType: SpaceType;
  label: string;
  imageSrc: string;
  imageWidth: number;
  imageHeight: number;
  corners: [Point, Point, Point, Point];
};

const W = 960;
const H = 600;

export const VISUALIZER_PRESETS: VisualizerPreset[] = [
  {
    id: "floor-living-room",
    spaceType: "Floor",
    label: "Living Room Floor",
    imageSrc: "/visualizer/floor-living-room.jpg",
    imageWidth: W,
    imageHeight: H,
    corners: [
      { x: 300, y: 340 },
      { x: 660, y: 340 },
      { x: 880, y: 580 },
      { x: 80, y: 580 },
    ],
  },
  {
    id: "wall-feature",
    spaceType: "Wall",
    label: "Feature Wall",
    imageSrc: "/visualizer/wall-feature.jpg",
    imageWidth: W,
    imageHeight: H,
    corners: [
      { x: 140, y: 70 },
      { x: 820, y: 70 },
      { x: 860, y: 520 },
      { x: 100, y: 520 },
    ],
  },
  {
    id: "bathroom-floor",
    spaceType: "Bathroom",
    label: "Bathroom Floor",
    imageSrc: "/visualizer/bathroom-floor.jpg",
    imageWidth: W,
    imageHeight: H,
    corners: [
      { x: 260, y: 300 },
      { x: 700, y: 300 },
      { x: 860, y: 560 },
      { x: 100, y: 560 },
    ],
  },
  {
    id: "parking-lot",
    spaceType: "Parking",
    label: "Parking Area",
    imageSrc: "/visualizer/parking-lot.jpg",
    imageWidth: W,
    imageHeight: H,
    corners: [
      { x: 180, y: 260 },
      { x: 780, y: 260 },
      { x: 940, y: 580 },
      { x: 20, y: 580 },
    ],
  },
  {
    id: "lawn-garden",
    spaceType: "Lawn",
    label: "Garden Lawn",
    imageSrc: "/visualizer/lawn-garden.jpg",
    imageWidth: W,
    imageHeight: H,
    corners: [
      { x: 220, y: 280 },
      { x: 740, y: 280 },
      { x: 900, y: 580 },
      { x: 60, y: 580 },
    ],
  },
  {
    id: "drawing-room-floor",
    spaceType: "Drawing Room",
    label: "Drawing Room Floor",
    imageSrc: "/visualizer/drawing-room-floor.jpg",
    imageWidth: W,
    imageHeight: H,
    corners: [
      { x: 280, y: 320 },
      { x: 680, y: 320 },
      { x: 900, y: 570 },
      { x: 60, y: 570 },
    ],
  },
];

export const SPACE_TYPES: SpaceType[] = [
  "Floor",
  "Wall",
  "Bathroom",
  "Parking",
  "Lawn",
  "Drawing Room",
];
