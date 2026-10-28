# VS — How It Works

An animated explainer channel: **Nao**, an anime girl, explains how technology
actually works — in plain language, over a living isometric world.

One episode = one question ("How does HTTPS actually keep you safe?") answered in
45–75 seconds, with an illustrated presenter, an isometric prop stage that builds
itself as she talks, and captions that carry the whole script for viewers with
sound off.

The whole studio lives in [`how-it-works-studio/`](how-it-works-studio/).
Start there:

```bash
cd how-it-works-studio
npm install
npm run doctor
npm run sheet:check
npm run build -- 0001-what-happens-when-you-type-a-url
```

Those are the commands the studio is being built to expose, not commands that
work today — `src/` does not exist yet. See **Status** below.

---

### The content lives in a spreadsheet

This is the deliberate difference from a normal animation repo: **you write the
episode in a Google Sheet / Excel workbook, not in code.**

| You edit | You get |
| --- | --- |
| One row in `Episodes` | a new episode |
| One row per beat in `Beats` | the scene order, timing, and narration |
| Rows in `Props` | the isometric world behind her |
| Rows in `Sources` | the fact-check trail for every claim |

The workbook is exported into the repo (`content/how-it-works.xlsx` plus a CSV
mirror), so a render is offline, diffable, and reproducible. No sheet, no
network, no surprises.

```
Episodes + Beats + Props + Sources   (workbook)
        ↓  npm run sheet:build
projects/<slug>/episode.json
        ↓  npm run render
output/final.mp4
```

---

### What's in here

```
how-it-works-studio/
├── README.md               setup, commands, workbook format
├── CLAUDE.md               instructions for an AI coding agent in this repo
├── IMPLEMENTATION-PLAN.md  the build plan, phase by phase, file by file
├── docs/                   the design spec: character, style, isometric world,
│                           motion, scenes, the content sheet, rendering, QC
├── templates/              episode script, config, publishing copy, sheet tabs
├── examples/               a fully written reference episode (no film yet)
├── topics.md               question backlog, tracked as episodes ship
└── assets/                 bundled fonts and licences
```

Status: **specification complete, renderer not yet built.** The documents define
the pipeline precisely enough to implement; `IMPLEMENTATION-PLAN.md` says in what
order. There is no `final.mp4` in this repository yet, and nothing here claims
there is one.

---

### The character

Nao is a drawn character, not a real person and not a talking-head avatar
generated per episode. She is a rig — layered SVG parts driven by pose,
expression, and gesture IDs from the sheet. The same three IDs always produce the
same frame.

She is a presenter, not a personality brand: she never gives medical, legal, or
financial advice, and every factual claim in her mouth is traceable to a row in
`Sources`.

See [`docs/02-character-and-voice.md`](how-it-works-studio/docs/02-character-and-voice.md).
