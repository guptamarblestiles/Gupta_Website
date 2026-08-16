/**
 * Preset room "photos" for the /visualizer AR-lite tool. Each preset has
 * one or more independent ZONES (floor and/or wall), each with its own 4
 * corner points (in the image's own pixel space) defining the plane a tile
 * texture gets warped onto — see lib/visualizer/homography.ts. Zones are
 * independent: swapping the floor tile never touches the wall layer and
 * vice versa (not pattern-mixing within one zone — two separate swappable
 * surfaces in the same photo).
 *
 * DEVIATION FROM BRIEF: the brief asked for curated stock photos. Sourcing
 * real photos would mean either guessing image URLs (not allowed) or
 * downloading from a third-party stock site chosen unilaterally — and real
 * photos also require someone to eyeball-pick 4 corner points per zone by
 * hand, which is exactly where this feature was flagged as highest-risk.
 * These are instead simple generated room illustrations (scripts/
 * visualizer/generatePresets.ts) where every zone's corners are known
 * exactly by construction, so the homography math can be verified as
 * correct independent of corner-picking accuracy. Swap in real photos
 * later by replacing the image file and re-measuring corners — the config
 * shape doesn't change.
 *
 * Corner order is always [top-left, top-right, bottom-right, bottom-left]
 * of the target plane, matching lib/visualizer/homography.ts's expected
 * unit-square correspondence.
 */
export type SpaceType = "Floor" | "Wall" | "Bathroom" | "Parking" | "Lawn" | "Drawing Room";
export type ZoneKind = "floor" | "wall";

export type Point = { x: number; y: number };

export type VisualizerZone = {
  kind: ZoneKind;
  corners: [Point, Point, Point, Point];
};

export type VisualizerPreset = {
  id: string;
  spaceType: SpaceType;
  label: string;
  imageSrc: string;
  imageWidth: number;
  imageHeight: number;
  zones: VisualizerZone[];
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
    zones: [
      {
        kind: "floor",
        corners: [
          { x: 300, y: 340 },
          { x: 660, y: 340 },
          { x: 880, y: 580 },
          { x: 80, y: 580 },
        ],
      },
    ],
  },
  {
    id: "wall-feature",
    spaceType: "Wall",
    label: "Feature Wall",
    imageSrc: "/visualizer/wall-feature.jpg",
    imageWidth: W,
    imageHeight: H,
    zones: [
      {
        kind: "wall",
        corners: [
          { x: 140, y: 70 },
          { x: 820, y: 70 },
          { x: 860, y: 520 },
          { x: 100, y: 520 },
        ],
      },
    ],
  },
  {
    id: "bathroom-full",
    spaceType: "Bathroom",
    label: "Bathroom",
    imageSrc: "/visualizer/bathroom-full.jpg",
    imageWidth: W,
    imageHeight: H,
    zones: [
      {
        kind: "wall",
        corners: [
          { x: 120, y: 60 },
          { x: 840, y: 60 },
          { x: 860, y: 300 },
          { x: 100, y: 300 },
        ],
      },
      {
        kind: "floor",
        corners: [
          { x: 260, y: 300 },
          { x: 700, y: 300 },
          { x: 860, y: 560 },
          { x: 100, y: 560 },
        ],
      },
    ],
  },
  {
    id: "parking-lot",
    spaceType: "Parking",
    label: "Parking Area",
    imageSrc: "/visualizer/parking-lot.jpg",
    imageWidth: W,
    imageHeight: H,
    zones: [
      {
        kind: "floor",
        corners: [
          { x: 180, y: 260 },
          { x: 780, y: 260 },
          { x: 940, y: 580 },
          { x: 20, y: 580 },
        ],
      },
    ],
  },
  {
    id: "lawn-garden",
    spaceType: "Lawn",
    label: "Garden Lawn",
    imageSrc: "/visualizer/lawn-garden.jpg",
    imageWidth: W,
    imageHeight: H,
    zones: [
      {
        kind: "floor",
        corners: [
          { x: 220, y: 280 },
          { x: 740, y: 280 },
          { x: 900, y: 580 },
          { x: 60, y: 580 },
        ],
      },
    ],
  },
  {
    id: "drawing-room-1",
    spaceType: "Drawing Room",
    label: "Drawing Room — Classic",
    imageSrc: "/visualizer/drawing-room-1.jpg",
    imageWidth: W,
    imageHeight: H,
    zones: [
      {
        kind: "wall",
        corners: [
          { x: 100, y: 50 },
          { x: 860, y: 50 },
          { x: 880, y: 320 },
          { x: 80, y: 320 },
        ],
      },
      {
        kind: "floor",
        corners: [
          { x: 280, y: 320 },
          { x: 680, y: 320 },
          { x: 900, y: 570 },
          { x: 60, y: 570 },
        ],
      },
    ],
  },
  {
    id: "drawing-room-2",
    spaceType: "Drawing Room",
    label: "Drawing Room — Modern",
    imageSrc: "/visualizer/drawing-room-2.jpg",
    imageWidth: W,
    imageHeight: H,
    zones: [
      {
        kind: "wall",
        corners: [
          { x: 60, y: 40 },
          { x: 900, y: 40 },
          { x: 920, y: 280 },
          { x: 40, y: 280 },
        ],
      },
      {
        kind: "floor",
        corners: [
          { x: 240, y: 280 },
          { x: 720, y: 280 },
          { x: 930, y: 580 },
          { x: 30, y: 580 },
        ],
      },
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
