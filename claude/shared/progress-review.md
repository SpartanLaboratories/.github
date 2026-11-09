## Progress review every 10 minutes (when you run inside a /resolve-issue run)
{"name":"Progress review every 10 minutes (when you run inside a /resolve-issue run)","code":"G-SH-P","id":28}

Note the time when you start (`date -u +%Y-%m-%dT%H:%M:%SZ`). After each step of your
work, check the clock; once 10 minutes have passed since you started, and again every 10
minutes after that, take a brief look at your own progress and write it where the issue
board shows it in its step Panel. This is the one file you may write besides your
own outputs; it is never committed.

- **Where:** in the repository checkout you work in (`git rev-parse --show-toplevel`),
  `docs/plans/.live/progress/<issue>/<name>.js`, where `<issue>` is the issue number and
  `<name>` is your agent name — for a researcher, `researcher-<question-slug>`; for one of
  several parallel instances of the same agent, add the slug of your share of the work.
  Create the folder if it is missing (`docs/plans/.live/` is git-ignored).
- **What:** one line of JavaScript, overwriting the file each time:
  `(window.PROGRESS=window.PROGRESS||{})["<name>"]={"agent":"<name>","issue":<n>,"started":"<ISO>","at":"<ISO now>","done":"<what you have finished, one short sentence>","left":"<what is still to do, one short sentence>","eta":"<your honest estimate, e.g. ~10 min>"};`
  Keep each text under 200 characters, plain facts, no work level named, no local paths,
  no secrets.
- **While building a stage whose table names steps,** add `"step":"<step-id>"` to the note,
  the id of the step you are on, and rewrite the note when you move to the next step.
- **When you finish,** delete your file, so the board shows only work in progress.
- Writing it never replaces your report, and a failure to write it is not a reason to stop.
