// Strict command-line arguments for every dashboards script (plan/scripts/*.js, system/scripts/*.js, verify/verify-templates.js).
// A script declares its options; before it reads or writes a file, strict() refuses anything else: an unknown option, a valued
// option with no value, or too few or too many positional arguments print the usage to stderr and exit 2. --help or -h prints the
// usage to stdout and exits 0, and nothing runs. Written after board.js took "--help" for a normal run and rewrote a committed
// docs/plans/board.json.
//   const { strict } = require(".../system/scripts/cliargs.js");
//   strict(process.argv.slice(2), { usage: "usage: node x.js <folder> [--root <repo>] [--check]", valued: ["root"], flags: ["check"], min: 1, max: 1 });
// It only validates: each script goes on reading its arguments as before.
"use strict";
function strict(args, spec) {
  const valued = spec.valued || [], flags = spec.flags || [], min = spec.min || 0, max = spec.max == null ? Infinity : spec.max;
  const usage = String(spec.usage || "").trim();
  const die = msg => { console.error(`${msg}\n${usage}\n(--help prints this)`); process.exit(2); };
  if (args.includes("--help") || args.includes("-h")) { console.log(usage); process.exit(0); }
  const positional = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (/^--?[A-Za-z]/.test(a)) {
      const name = a.replace(/^--?/, "");
      if (!a.startsWith("--")) die(`unknown option ${a}`);
      if (valued.includes(name)) { const v = args[i + 1]; if (v == null || /^--?[A-Za-z]/.test(v)) die(`${a} needs a value`); i++; }
      else if (!flags.includes(name)) die(`unknown option ${a}`);
    } else positional.push(a);
  }
  if (positional.length < min) die(min === 1 ? "missing argument" : `expects at least ${min} arguments`);
  if (positional.length > max) die(`unexpected argument ${JSON.stringify(positional[max])}`);
  return positional;
}
module.exports = { strict };
