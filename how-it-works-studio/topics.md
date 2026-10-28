# Question Backlog

Take the first unchecked question when asked to pick one.

Only check a question once the episode is rendered and verified, and add it to
the Completed table with its `episode_id` and date.

A question enters this list only if it passes the four-question test in
`docs/03-script-and-explainer-writing.md`. "How does the internet work?" does
not; "What happens when you type a web address?" does.

## Ready to write

### Networking
- [x] What happens when you type a web address?
- [ ] What is an IP address, really?
- [ ] Why does your WiFi get slow when everyone streams?
- [ ] What is a port number?
- [ ] How does a message know the way to its destination?
- [ ] What actually is "the cloud"?

### Security
- [ ] What does the padlock in your browser actually prove?
- [ ] How does a password get checked without the site storing it?
- [ ] What is two-factor authentication protecting you from?
- [ ] Why is "123456" the password everyone names?
- [ ] What is a cookie, and why is it everywhere?

### The web
- [ ] What happens when you click "buy"?
- [ ] What is an API, in one minute?
- [ ] Why do some pages load instantly and others crawl?
- [ ] What is a cache, and why does clearing it fix things?
- [ ] How does a search engine decide what to show first?

### Computers
- [ ] What is a file, physically?
- [ ] Why does restarting fix so many things?
- [ ] What is RAM doing that a disk isn't?
- [ ] How does a computer know what a program is?
- [ ] Why are some images sharp and some blurry?

### Data
- [ ] What is a database index?
- [ ] How is a video compressed into a file that small?
- [ ] What is encryption, without the maths?
- [ ] How does a recommendation decide what you like?

## Completed

| Episode | Question | Folder | Rendered | Date |
| --- | --- | --- | --- | --- |
| 0001 | What happens when you type a web address? | `examples/0001-what-happens-when-you-type-a-url/` | **no** — scripted only | 2026-10-28 |

`examples/` holds a written episode, not a rendered one. It is the compiler's
fixture and the writer's reference. Move it to `projects/` when it has been built
and rendered.
