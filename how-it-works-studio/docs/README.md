# The Spec

Ten documents, in reading order. Read `01` and `02` before writing anything; read
the rest when you touch that part of the system.

| # | Document | Answers |
| --- | --- | --- |
| 01 | [Project and Workflow](01-project-and-workflow.md) | What is this channel, who is it for, and what is the process from question to post? |
| 02 | [Character and Voice](02-character-and-voice.md) | Who is Nao, how is she built, how does she move, and how does she speak? |
| 03 | [Script and Explainer Writing](03-script-and-explainer-writing.md) | How do you write an explanation that is clear, honest, and short? |
| 04 | [Visual Style](04-visual-style.md) | Palette, type, the five zones, and what this style is not. |
| 05 | [The Isometric World](05-isometric-world.md) | The projection, the slot grid, the prop library, lighting, depth, assembly. |
| 06 | [Motion and Timing](06-motion-and-timing.md) | Where the time in a beat goes, and why most of it should not move. |
| 07 | [Components and Beat Types](07-components-and-scenes.md) | The component inventory and what each of the twelve beat types composes. |
| 08 | [The Content Sheet](08-content-sheet.md) | Every tab, every column, every rule the workbook is validated against. |
| 09 | [Technical and Rendering](09-technical-and-rendering.md) | The pipeline, the frame model, determinism, audio, storage, failures. |
| 10 | [Quality, Safety, and Publishing](10-quality-and-publishing.md) | The checklists, corrections, asset rights, and the publishing document. |

Two companion files sit outside `docs/`:

- [`../IMPLEMENTATION-PLAN.md`](../IMPLEMENTATION-PLAN.md) — what to build, in what
  order, and what to build before anything else.
- [`../CLAUDE.md`](../CLAUDE.md) — instructions for an AI agent working in this
  repository.

## How these documents relate

```
01 workflow
 ├── 02 character ──────┐
 ├── 03 writing ────────┤
 ├── 08 content sheet ──┤   these four define what an episode IS
 │                      │
 ├── 04 style ──┐       │
 ├── 05 world ──┼───────┤   these four define what it LOOKS like
 ├── 06 motion ─┤       │
 ├── 07 beats ──┘       │
 │                      │
 ├── 09 technical ──────┘   how it is produced
 └── 10 quality             how it is judged
```

## Keeping them true

A change in behaviour is a change in `docs/`. The rule the reference studio used
applies here unchanged: teach the docs a new behaviour in the same commit that
implements it, or the docs become fiction, and a fiction is worse than a gap
because it is trusted.
