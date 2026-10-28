# Script and Explainer Writing

## Core concept

Every episode answers exactly one question, in plain language, in under 75
seconds.

The question is the whole design. "How does the internet work?" is not an
episode, it is a season. "What happens after you press enter on a web address?"
is an episode.

## The question test

Before writing anything, the question must pass all four:

1. **It has an answer.** Not a debate, not an opinion, not "is X better than Y".
2. **A smart non-expert has wondered it at least once.** If the answer only
   helps people who already know the field, it is not an episode.
3. **It can be answered in 150–200 words without lying.** If it needs footnotes,
   split it.
4. **You can name the thing the viewer walks away holding.** One mechanism, one
   number, one mental model. If you cannot state it in a sentence, the episode
   has no spine.

Write the walkaway sentence down before the beats:

> "A web address is a name; DNS is the phone book; the page is fetched in a
> round trip you can count."

If the walkaway will not fit in one sentence, the episode will not fit in one
video.

## Narrative structure

Default shape for a 60-second episode. Durations are starting points, and the
sheet's `beat_type` column names each one.

### 1. Hook — 3 to 5 s

State the question as a concrete moment, not as a topic.

- Strong: "You type an address, press enter, and a page appears."
- Weak: "Today we're talking about DNS."

The hook is a scene the viewer has physically performed. That is what makes them
stay: they have done this gesture a thousand times and never seen what happened.

### 2. What it is — 8 to 12 s

The plain-language definition, delivered as a thing in the world. Not a
dictionary entry.

- "Your computer needs a map from a name to a number."

### 3. How it works — 25 to 35 s

The body. Three to five steps, each its own beat, each with its own prop
arriving. This is where the isometric world does the teaching: the viewer sees
the stack build.

Rules for the middle:
- One new idea per beat. Exactly one.
- Each beat names the thing *before* it explains it.
- Introduce at most three new terms in the whole episode. Every extra term costs
  a viewer.
- If a beat could be deleted without confusing anyone, delete it.
- When two beats in a row share a `beat_type`, ask whether one of them should be
  a different type — a `compare` breaks a run of `explain` better than another
  `explain`.

### 4. Why it matters / the caveat — 8 to 12 s

The honest part. Where the analogy breaks, what the model does not cover, or the
one thing practitioners know that beginners get wrong.

- "The phone book analogy breaks at scale: there are thirteen root servers, and
  copies are cached closer to you."

This beat is what separates an explainer from a slideshow. It also builds trust:
a channel that admits a limit is a channel that can be believed next time.

### 5. Recap — 6 to 8 s

Three chips, each one noun phrase, in the order they were built.

- "NAME → ADDRESS", "ADDRESS → MACHINE", "MACHINE → PAGE"

### 6. Outro — 3 to 4 s

One line, the takeaway, and the episode badge. No CTA stack.

## Timing and length budgets

At 30 fps and a 60 s target (a floor plan, not the reference episode — that one
runs 75 s with longer holds, and the holds are the point):

| Section | Beats | Seconds |
| --- | --- | --- |
| Hook | 1 | 4 |
| What it is | 1–2 | 10 |
| How it works | 3–5 | 30 |
| Caveat | 1–2 | 9 |
| Recap | 1 | 5 |
| Outro | 1 | 3 |
| **Total** | **8–12** | **61** |

Reading-speed budget: a caption card holds **14 words comfortably, 20 at the
limit**, and stays on screen for at least `words ÷ 4` seconds plus 0.6 s of
settle. A 75 s episode therefore carries at most ~210 caption words, which is the
same as the spoken script. That is not a coincidence — it is why the caption band
is the script.

The reference episode lands at exactly 100 words in 75 s — deliberately sparse.
An explainer that is easy to read twice beats a dense one that must be paused.

If the script is longer, cut a beat. Do not speed up the read.

## Writing for the caption band

The band is 624 × 180 px, two lines, 44 px. That is roughly 34 characters per
line.

- **Two lines maximum.** If it wraps to three, cut words.
- **Break on the idea, not the pixel.** Write the line so the wrap falls between
  a subject and its consequence.
- **No orphan emphasis.** A tinted token should not land alone on the second
  line with nothing after it.
- **Front-load the noun.** "A cache is a copy kept close by" beats "Kept close
  by, there is something called a cache."
- **Numbers and acronyms tint.** `emphasis` cells mark the tokens to highlight;
  at most two per card, or the card looks like confetti.

## The analogy rules

Analogies are the main tool and the main risk.

1. **Analogy first, mechanism second.** The metaphor gets the viewer oriented;
   the mechanism gets them correct.
2. **Name the mapping out loud.** "The DNS server is the phone book." If the
   viewer has to infer which part maps to which, the analogy is decoration.
3. **Say where it breaks, in the same episode.** Every analogy breaks. The
   `myth-check` beat exists for cases where the popular version is *actively*
   false; a single sentence in the caveat beat covers the rest.
4. **One analogy per episode.** Two competing metaphors in 60 seconds is a
   memory test, not an explanation.

### Tested analogies

| Concept | Analogy | Where it breaks |
| --- | --- | --- |
| DNS | phone book / contacts app | cached copies, thirteen roots, no single book |
| IP address | postal address | addresses get reassigned; a house does not move |
| TCP | numbered envelopes, receipt required | the network can reorder, not just lose |
| HTTPS | a sealed envelope only the recipient opens | it proves the *site*, not that the site is honest |
| Cache | a sticky note on your desk | stale notes are the whole problem |
| API | a restaurant menu | a menu does not rate-limit you |
| Public key crypto | a padlock you hand out, key kept private | it does not hide who you are talking to, only what you say |
| Container | a shipping container | containers share a kernel, ships do not |
| Load balancer | a host seating guests | a host can see the guest; a balancer often cannot |
| Database index | a book's index | an index costs write time, a book's does not |

Do not reuse an analogy that is not on this list without marking where it breaks
in the script.

## Accuracy rules

- **Every factual claim gets a `Sources` row.** One claim, one row, one URL, one
  checked date. If you cannot source it, cut it.
- **Prefer primary documentation**: RFCs, vendor docs, specs, standard bodies.
  A blog post is a signpost to a source, not a source.
- **Numbers age.** Any figure gets a checked date in `Sources`, and the
  publishing copy carries that date. "As of 2026" beats a bare number.
- **Say "usually" when it is usually.** Most websites are HTTPS; that is not the
  same as all of them.
- **Do not describe a named product's internals** unless its documentation does.
- **No security instructions.** Explain how TLS works; do not explain how to
  attack it. This is a hard line, not a guideline.
- **Corrections ship as a re-cut**, `-v2`, with the correction named in the
  description. Never silently replace a published episode.

## Example, in full

Question: *What happens when you type a web address?*

| # | Type | s | Narration / caption |
| --- | --- | --- | --- |
| 1 | hook | 4.0 | You type an address and press enter. |
| 2 | title | 3.0 | Four things happen before the page appears. |
| 3 | explain | 6.0 | The address is a name. Computers route by number. |
| 4 | explain | 7.0 | So first something has to look the name up. |
| 5 | analogy | 8.0 | That's DNS: a contacts app for the internet. |
| 6 | step-by-step | 9.0 | You ask a resolver. It asks up the chain. The answer comes back. |
| 7 | explain | 7.0 | Now you have a number: the server's address. |
| 8 | packet-trip | 9.0 | Your request travels there and a reply travels back. |
| 9 | explain | 6.0 | The reply is the page: HTML, images, styles. |
| 10 | myth-check | 8.0 | It isn't one big computer. It's copies cached close to you. |
| 11 | recap | 5.0 | Name. Address. Request. Page. |
| 12 | outro | 3.0 | That's what the enter key actually does. |

75.0 seconds, 12 beats, 100 spoken words, 3 terms introduced (address, server,
cache). Every claim has a source. This is written out in full at
`examples/0001-what-happens-when-you-type-a-url/`..

## Common failure modes

| Symptom | Cause | Fix |
| --- | --- | --- |
| Feels rushed | too many beats for the length | cut a beat, extend the remaining ones |
| Feels slow | every beat is an `explain` | vary the type; let the world move |
| Confusing at beat 5 | a term was used before it was defined | move the definition, delete the term |
| Sounds like a textbook | subject-first passive sentences | rewrite in second person, present tense |
| Preachy in the caveat | the caveat is a lecture | one sentence, one limit, move on |
| The world looks decorative | props appear without purpose | every prop must be named by the narration |
| Wrong on re-watch | a claim was inherited, not checked | open the source, read it, date it |
