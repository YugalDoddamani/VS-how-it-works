# Final reels

Every finished film, in one folder. Open a file and watch it; nothing here needs
to be built first.

This folder is generated - the film next to its project is the source of truth.
Collect or refresh it with:

    cd how-it-works-studio
    npm run reels:collect

| Film | Title | Project | Length | Size | Source |
| --- | --- | --- | --- | --- | --- |
| [0102-how-ai-automation-actually-works.mp4](0102-how-ai-automation-actually-works.mp4) | 0102 — How AI automation actually works | ai-without-the-hype · episode | 1:18 | 11.7 MB | `series/ai-without-the-hype/episodes/0102-how-ai-automation-actually-works/output/0102-how-ai-automation-actually-works.mp4` |
| [0106-chatbot-vs-ai-agent.mp4](0106-chatbot-vs-ai-agent.mp4) | 0106 — Chatbot or agent? | ai-without-the-hype · episode | 0:55 | 9.7 MB | `series/ai-without-the-hype/episodes/0106-chatbot-vs-ai-agent/output/0106-chatbot-vs-ai-agent.mp4` |
| [0107-what-happens-when-you-type-a-url.mp4](0107-what-happens-when-you-type-a-url.mp4) | 0107 — What happens when you type a URL? | the-cloud · episode | 0:54 | 10.7 MB | `series/the-cloud/episodes/0107-what-happens-when-you-type-a-url/output/0107-what-happens-when-you-type-a-url.mp4` |
| [r03-why-the-ad-follows-you.mp4](r03-why-the-ad-follows-you.mp4) | R03 — Why the ad follows you around. | your-data-explained · reel | 0:45 | 7.0 MB | `series/your-data-explained/reels/r03-why-the-ad-follows-you/output/r03-why-the-ad-follows-you.mp4` |

Each film is accompanied by its subtitle track (`.srt`) and a key-frame sheet
(`-key-frames.jpg`) so a review can start without pressing play.

## Why this folder exists

A render is a build artefact: it lives in `series/<series>/<kind>/<id>/output/`
and can be regenerated. A *delivery* is not. The one place a reviewer looks is
the repo root, so the films are copied here as well, and `npm run reels:collect
-- --check` fails when a new film has not been added.
