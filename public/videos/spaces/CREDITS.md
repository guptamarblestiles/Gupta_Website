# Spaces section — video credits

All clips sourced from Pexels, used under the Pexels License (free for
commercial use, no attribution required). Originals renamed per
`/Users/rakshitdahiya2.0/Desktop/videos/RENAME_MAP.md`; web-ready copies
here are re-encoded (H.264, audio stripped, max 1280px long edge) from
those originals — see each file below.

Encode recipe (`ffmpeg -i <src> -an -vf scale=...-1280... -c:v libx264
-preset slow -crf 26 -pix_fmt yuv420p -profile:v high -level 4.0 -movflags
+faststart`): keep these settings consistent across every clip. The first
`exterior-01.mp4` pass used `-crf 24` with no explicit `-profile/-level`
and produced a file that passed `ffprobe` validation cleanly but silently
failed to load in Chrome (readyState stuck at 0, no error event, even in
a bare `<video>` with no app code involved) — re-encoding with the same
recipe as the other three clips fixed it. If a future clip does this
again, suspect the encode pass before the source file.

| File | Original source file | Notes |
|---|---|---|
| `interior-01.mp4` | `16278693_1440_2560_30fps.mp4` | Patterned-floor corridor, portrait |
| `interior-02.mp4` | `16605510_3840_2160_30fps.mp4` | Bedroom, landscape 4K source |
| `exterior-01.mp4` | `6010310-uhd_2160_3840_25fps.mp4` (originally `exterior-02-courtyard-veranda_portrait.mp4`) | Courtyard/veranda, portrait 4K source. Replaces the initial choice (house facade, `17224631-uhd_3840_2160_30fps.mp4`) — that source was a lower native resolution (2560x1440, despite its "uhd" filename) and looked noticeably softer once re-encoded; this clip is true 4K and sharper. The house-facade clip also had a visible "A Project By New Look Constructions" project signboard in frame for its full duration — a second, independent reason not to use it. |
| `washroom-01.mp4` | `8403602-hd_1920_1080_30fps.mp4` | Vanity / hex tile backsplash, landscape |

Not used: `exterior-01-house-facade_landscape.mp4` (superseded, see above —
kept on disk under the original Desktop/videos folder, just not copied
into this site's asset set) and `exterior-03-patio-paving-topdown_portrait.mp4`
(flagged as the weakest of the three exterior clips). Exterior ships with
a single clip for now, matching Washroom's single-clip treatment; re-add
a second clip later by extending the `clips` array for Exterior in
`components/sections/SpacesSection.tsx` if it should get its own
two-clip crossfade like Interior.
