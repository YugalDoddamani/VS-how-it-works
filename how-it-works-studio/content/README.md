# Content

The workbook is the source of truth for every episode.

| Path | What it is |
| --- | --- |
| `how-it-works.xlsx` | The working workbook: 8 data tabs plus a `Read me` tab. Committed. |
| `csv/<tab>.csv` | The same data, one file per tab. Committed, because a diff in a pull request has to be readable and `.xlsx` is binary. |

## Which copy wins

The CSV mirror is a **view** of the workbook, not an input. If the two disagree,
the workbook is right and the mirror is stale — regenerate it.

```bash
npm run sheet:export     # xlsx → csv/
npm run sheet:pull       # Google Sheet → xlsx + csv/
```

`npm run sheet:build` reads `how-it-works.xlsx` only.

## Editing

Edit in Excel, LibreOffice, or a Google Sheet. If you work in Google Sheets, set
`sheet.id` in `studio.config.json` and run `npm run sheet:pull` to bring the copy
into the repo before committing.

Never commit a workbook with unsaved edits from a render, and never edit
`projects/<slug>/episode.json` — that file is generated. If a number is wrong,
the sheet is wrong.

## Tabs

`Read me`, `Episodes`, `Beats`, `Props`, `Paths`, `Character`, `Sources`,
`Publish`, `Vocab`.

Full column reference: [`../docs/08-content-sheet.md`](../docs/08-content-sheet.md).

## Current contents

One episode is written: **0001 — What happens when you type a web address?**
(12 beats, 75.0 s, status `scripted`). It exists to be the fixture the compiler
and the validator are tested against, and the example a writer copies.
