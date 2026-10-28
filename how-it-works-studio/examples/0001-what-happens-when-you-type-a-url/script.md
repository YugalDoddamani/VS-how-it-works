# Episode 0001: What happens when you type a web address?

<!--
Reference episode. This is the shape `npm run sheet:build` writes into
projects/<slug>/script.md from the workbook. It has not been rendered: there is no
final.mp4 for it yet, and this file does not claim otherwise.
-->

## Episode details

| | |
| --- | --- |
| Episode id | 0001 |
| Slug | `0001-what-happens-when-you-type-a-url` |
| Series | Networking · 01 |
| Level | beginner |
| Beats | 12 |
| Length | **75.0 s** — 2250 frames @ 30 fps |
| Words spoken | 100 |
| Terms introduced | 3 (address, server, cache) |
| Audio | silent (captions carry the script) |
| Status | `scripted` — beats written, sheet valid, not yet built |

## The question

> What actually happens after you press enter?

**Four-question test**

- [x] It has an answer. DNS, TCP, HTTP — a mechanism, not a debate.
- [x] A smart non-expert has wondered it. Everyone has pressed enter.
- [x] Answerable in ~100 words without lying. The caveat beat carries the limit.
- [x] The walkaway is one sentence (below).

## The walkaway

> A name becomes a number, a request travels, and a page comes back.

## The answer, in plain words

You type a name, but computers route by number — so first something looks the
name up. That lookup is DNS, which works like a contacts app that phones a chain
of people until someone knows the answer. Once you have the number, your request
travels to that machine and a reply travels back. The reply is the page. And the
machine is almost never one big computer: it is copies, cached close to you.

## Terms introduced

| Term | Defined in beat | Defined by what it does |
| --- | --- | --- |
| address | 3 | "The address is a name. Computers route by number." |
| server | 7 | "Now you have a number: the server's address." |
| cache | 10 | "It's copies cached close to you." |

Three terms, and the episode defines each one in the sentence *before* it names
it. That ordering is the rule, not a stylistic choice.

## Analogy

- **Analogy:** DNS is a contacts app for the internet.
- **Mapping:** the phone *is* the contacts app; the server in `D2` is the person
  being looked up; the name in, number out.
- **Where it breaks:** a contacts app is one list on one device. DNS is
  distributed across a hierarchy, with cached copies everywhere. Beat 10 says so
  explicitly with a `myth-check` — the "one big computer" misconception is the
  one that survives the analogy, so it gets its own beat.

## Beat breakdown

| # | Type | s | Frames | Narration | Board | Props | Nao |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | hook | 4.0 | 120 | You type an address and press enter. | — | — | point-camera · curious |
| 2 | title | 3.0 | 90 | Four things happen before the page appears. | What happens when you press enter? | desktop | sweep-wide · confident |
| 3 | explain | 6.0 | 180 | The address is a name. Computers route by number. | A name not a number | desktop, signpost | point-board · focused |
| 4 | explain | 7.0 | 210 | So first something has to look the name up. | The lookup | desktop, server | talk-hands · focused |
| 5 | analogy | 8.0 | 240 | That's DNS: a contacts app for the internet. | DNS is a contacts app · Name goes in / Number comes out | desktop, phone, server | present-open · delighted |
| 6 | step-by-step | 9.0 | 270 | You ask a resolver. It asks up the chain. The answer comes back. | Ask a resolver / It asks the root / The answer comes back | server, tower, server | count-three · focused |
| 7 | explain | 7.0 | 210 | Now you have a number: the server's address. | An address | desktop, server, signpost | point-board · confident |
| 8 | packet-trip | 9.0 | 270 | Your request travels there and a reply travels back. | A round trip | desktop, server | lean-in · emphatic |
| 9 | explain | 6.0 | 180 | The reply is the page: HTML, images, styles. | The page | desktop, server, parcel | talk-hands · neutral |
| 10 | myth-check | 8.0 | 240 | It isn't one big computer. It's copies cached close to you. | Not one big computer | server, cloud, desktop | shrug→present · skeptical→delighted |
| 11 | recap | 5.0 | 150 | Name. Address. Request. Page. | Name to page | desktop, server | sweep-wide · relieved |
| 12 | outro | 3.0 | 90 | That's what the enter key actually does. | Episode 01 · NETWORKING | desktop, server | nod · delighted |

Total 75.0 s. Target 75 s, so the arithmetic is exact with no remainder absorbed.

### Why these beat types

- **Two `explain` beats open the body** because the first job is orientation, not
  mechanism. Each is under 8 s so the hook does not lose momentum.
- **The analogy lands before the mechanism.** A viewer who has the contacts-app
  picture will follow the three-machine lookup in beat 6 without a diagram.
- **`step-by-step` is the only beat with three machines on stage.** The count
  gesture and the numbered rail tell the viewer "this is a sequence" without a
  word of setup.
- **`packet-trip` is the signature shot and the only camera pan** in the episode.
  One per episode, and this is where the channel spends it.
- **`myth-check` at 10** is where the apology for the analogy happens. It is late
  on purpose: early caveats cost attention, late ones buy trust.
- **Recap is four words**, and those four words are the walkaway.

## Claims and sources

| Claim id | Beat | Claim | Source | Kind | Checked |
| --- | --- | --- | --- | --- | --- |
| 0001-c1 | 4 | DNS turns a domain name into an IP address. | RFC 1034 §3.6 | primary | 2026-10-20 |
| 0001-c2 | 5 | DNS is a distributed lookup, not one directory. | RFC 1034 §4.2 | primary | 2026-10-20 |
| 0001-c3 | 6 | Resolvers query the hierarchy on the client's behalf. | RFC 1035 | primary | 2026-10-20 |
| 0001-c4 | 8 | A request and reply each cross the network, so latency is at least one round trip. | RFC 9293 (TCP) | primary | 2026-10-20 |
| 0001-c5 | 9 | An HTTP response carries the markup, which references further resources. | RFC 9110 §6 | primary | 2026-10-20 |
| 0001-c6 | 10 | Pages are usually served from caches or CDN copies, not one origin machine. | RFC 9111 | primary | 2026-10-20 |
| 0001-c7 | 6 | There are 13 root server identities, operated as many anycast instances. | IANA root servers | primary | 2026-10-20 |

Every claim has a row, a URL, and a date a human opened the link. `quote` cells in
the workbook hold the supporting sentence where one applies.

## Editorial notes

- **75 s, not 60.** The first draft was 61 s and the holds were too tight: beat 4
  gave 3.4 s to a 9-word sentence *and* a prop assembly. It was rebuilt longer
  rather than narrated faster. The `target_seconds` cell moved with it, so the
  validator stays honest.
- **"Server" is introduced at 7, not 4**, even though a server prop appears at 4.
  A prop can be on stage before it is named; that is anticipation, and it makes
  the naming land.
- **The phone prop sits in slot `C3`, the same slot the server occupies at beat 4**
  — the server is off stage for the analogy beat, because two machines competing
  for the same slot would muddy the mapping.
- **Beat 10 changes expression mid-beat** via the `Character` tab: skeptical while
  the myth is on screen, delighted once the correct world rebuilds. The single
  `expression` column cannot express that, which is exactly what the `Character`
  tab is for.
- **No follow prompt in the narration.** It lives in the caption band on the outro
  only, per
  [`docs/02-character-and-voice.md`](../../docs/02-character-and-voice.md).

## Review notes

- [x] Answer stated within the first 10 s (beat 3, at 7.0 s).
- [x] Every claim sourced and dated.
- [x] Caveat beat is honest and short.
- [x] Read aloud without stumbling.
- [ ] Understandable muted in one watch — **needs a human pass on real frames.**
- [ ] Prop depth order verified — **needs a render.**

## Asset notes

- Fonts: Inter 400/500/600/700, SIL OFL 1.1, bundled in `assets/fonts/`.
- Visuals: all drawn geometry. No image or video assets.
- Audio: silent. No narration was recorded for this reference episode, so the
  rendered output (once built) will be silent and the report will say so.

## What this example is for

It is the fixture: the row set that `sheet:check` and `sheet:build` are expected
to accept, and the reference a writer copies from. If a validation rule cannot
accept this episode, the rule is wrong. If a beat type cannot render it, the
renderer is incomplete.
