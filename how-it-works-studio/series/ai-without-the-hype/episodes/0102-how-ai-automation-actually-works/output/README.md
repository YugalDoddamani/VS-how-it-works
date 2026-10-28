# 0102 — output

What is in here, and what to do with it.

| File | Use it for |
| --- | --- |
| `0102-how-ai-automation-actually-works.mp4` | **the film.** 1080×1920, 30 fps, 78.00 s, H.264 + AAC mono. Upload this. |
| `0102-how-ai-automation-actually-works.srt` | the platform's caption track. The captions are already burned in; this is for search and for anyone whose player prefers a subtitle track. |
| `key-frames.jpg` | twelve evenly spaced frames with the shot number and code under each. Read this to judge the cut without watching 78 seconds. |
| `vo.json` | where each voice-over clip starts (in frames) and the line it speaks. The mixer reads it; edit it if a line needs to move. |
| `vo/g1..g10.mp3` | the voice-over, one clip per beat. |
| `0102-silent.mp4` | the picture without the mix. Intermediate: it is the input to `mix-audio.mjs`, and it is git-ignored because it is only ever rebuilt. |

## Rebuilding

```sh
node tools/compile-episode.mjs 0102
node tools/render-reel.mjs --reel 0102 --all --mp4 .../output/0102-silent.mp4
node tools/mix-audio.mjs --reel 0102 --video .../0102-silent.mp4 --out .../0102-how-ai-automation-actually-works.mp4
node tools/export-captions.mjs --reel 0102
node tools/contact-sheet.mjs --reel 0102
```

The film is a pure function of `content/csv/` + `assets/`, so rebuilding on a
clean checkout produces the same 78 seconds: same cuts, same drawings, same
captions, same mix.

## Numbers

- 2340 frames, 32 shots, average shot 2.4 s
- 145 sound effects, 10 voice clips, peak −1.0 dBFS, mean −20.1 dB
- 12 caption cues (one per beat — the line is a sentence and it stays whole)
