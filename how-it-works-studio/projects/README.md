# Projects

One folder per built episode. Nothing here yet — no episode has been compiled or
rendered.

A project appears when a workbook row is built:

```bash
npm run sheet:build -- 0001-what-happens-when-you-type-a-url
```

which creates:

```
projects/0001-what-happens-when-you-type-a-url/
├── episode.json       compiled from the sheet; never edit by hand
├── script.md          narration in order, with claims and sources
├── publishing.md      written by `npm run publish`
├── render-report.json
├── preview/
├── frames/            git-ignored
└── output/final.mp4
```

The reference episode is written but not built: it lives in
`examples/0001-what-happens-when-you-type-a-url/` because it is a fixture and a
writer's example, not a rendered episode. Move it here once it has been built and
rendered.
