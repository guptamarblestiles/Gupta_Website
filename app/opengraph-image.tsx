/**
 * Site-wide social share preview (og:image/twitter:image) — Next.js
 * auto-wires a file with this name into every page's metadata that
 * doesn't set its own openGraph.images. Generated at request time via
 * next/og rather than a static asset, so it never goes stale and needs no
 * image file to keep in sync with the brand palette.
 */
import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#09090b",
          color: "#f5f5f4",
        }}
      >
        <div
          style={{
            width: 64,
            height: 4,
            backgroundColor: "#b87333",
            marginBottom: 32,
          }}
        />
        <div style={{ fontSize: 64, fontWeight: 600, letterSpacing: -1 }}>Gupta Marbles &amp; Tiles</div>
        <div style={{ fontSize: 28, color: "#a1a1aa", marginTop: 20 }}>
          Architectural Surfaces for Visionary Spaces
        </div>
      </div>
    ),
    size,
  );
}
