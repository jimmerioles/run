# Run explainer

The 3:19 film embedded at the top of the repository README.

## Master

| Property | Value |
| --- | --- |
| Duration | 199.345 s |
| Picture | 1920×1080, 30 fps, H.264 High@4.1, yuv420p |
| Audio | AAC, 48 kHz, stereo |
| Voice | Kokoro `af_heart` |
| Score | "house / midnight tech" by Vincent Schmalbach, MIT |
| Loudness | -16 LUFS integrated, -2.5 dBFS true peak |
| Release | `explainer-v1`, asset `run-explainer.mp4` |

The release asset is the canonical master. The README attachment is the same file and must stay byte-identical.

## Chapters

| Time | Chapter |
| --- | --- |
| 0:00 | One key press |
| 0:19 | The contract |
| 0:37 | The stage |
| 0:55 | Four checks |
| 1:15 | The body |
| 1:35 | The clock |
| 1:57 | The quiet layer |
| 2:20 | The compression |
| 2:40 | The quiet defaults |
| 3:01 | The demo is the product |

## Files

```
config.json     kit pin, theme, voice, mix, capture target
script.json     narration, segment beats, chapter titles
scenes.js       visual scenes for the film
capture.mjs     screenshots of the real page at key beats
assets/         captured page and terminal stills
music.json      score metadata and license
music.m4a       score bed
poster.jpg      first frame of the published master
golden/         reference frame for render checks
```

The generated `build/` directory is ignored. It holds narration stems, the mixed audio, stills, the render report, and the pre-poster film.

## Poster-first cut

The published master opens on `poster.jpg` instead of the original dark first frame. The poster holds for 2.5 s, crossfades for 0.5 s, then the film continues from 2.5 s. The original audio starts at zero, so duration, sync, and chapter timings are unchanged.

```bash
SOURCE=build/film.mp4
POSTER=poster.jpg
OUT=run-explainer.mp4
FPS=30
OFFSET=2.5
XFADE=0.5
POSTER_DURATION=$(awk -v a="$OFFSET" -v b="$XFADE" 'BEGIN { print a+b }')

ffmpeg -y -v error \
  -loop 1 -framerate "$FPS" -t "$POSTER_DURATION" -i "$POSTER" \
  -i "$SOURCE" \
  -filter_complex "\
[0:v]scale=1920:1080:flags=lanczos,fps=$FPS,format=yuv420p,setsar=1,settb=AVTB,trim=duration=$POSTER_DURATION,setpts=PTS-STARTPTS[poster];\
[1:v]trim=start=$OFFSET,setpts=PTS-STARTPTS,fps=$FPS,format=yuv420p,setsar=1,settb=AVTB[film];\
[poster][film]xfade=transition=fade:duration=$XFADE:offset=$OFFSET[v]" \
  -map "[v]" -map 1:a:0 -map_metadata 1 -map_chapters 1 -dn \
  -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p \
  -profile:v high -level 4.1 \
  -g $((FPS*2)) -keyint_min $((FPS*2)) -sc_threshold 0 \
  -c:a copy -movflags +faststart \
  "$OUT"
```

The source audio is AAC, so it is copied. If the source audio changes to a codec MP4 cannot carry, use `-c:a aac -b:a 192k`.

## Rebuild notes

The film was rendered with the explainer kit pinned at 1.1.0. `config.json` records the theme, voice, mix, capture target, and verification frame. `script.json` is the source of truth for narration and segment timing. The page captures come from a local dev server at `http://localhost:5174` using `capture.mjs`.

The kit itself is external to this repository. The checked-in inputs and the release asset are enough to inspect or replace the film, but a full re-render needs the kit and the generated `build/` inputs.
