"""graphify-hooks.py: install graphify's post-commit and post-checkout git hooks in the
repository at the current directory, as `graphify hook install` builds them, without its
merge-driver step, and place the board-file ignore beside the graph.

That step registers a git merge driver for graph.json and appends a line to the
repository's root .gitattributes, a tracked file. graph.json is git-ignored in these
repositories, so the driver would never run, and no repository gains a tracked file. The
rest is graphify.hooks.install() of graphify 0.9.82, built from the package's own
functions, so the hooks are the ones `graphify hook status` checks for.

The board-file ignore is the file `graphifyignore` beside this script, copied verbatim to
the checkout's root as `.graphifyignore`. graphify reads it at every build, refresh and
hook rebuild, and drops what it names, tracked files included. The copy is excluded
through the checkout's .git/info/exclude (the line `/.graphifyignore`, added first), so it
is never committed and `git status` does not change. A tracked `.graphifyignore`, or one
whose first line is not the template's, is reported and left as it is.

Run it from the repository's main checkout with the Python that has graphify, the one
graphify-out/.graphify_python names:

    <that python> ~/.claude/admin-team/graphify/graphify-hooks.py [--ignore-only]

`--ignore-only` places the ignore and nothing else, and needs no graph: a build runs it
before graphify reads the corpus. Without it, the script refuses a folder with no
graphify-out/graph.json (a linked worktree has none). Either way it writes nothing when
the package no longer has a function it uses. Run again, it updates the ignore and the
hooks' graphify blocks in place or reports them already in place; a hook that is not
graphify's keeps its own lines, with graphify's block appended. Without `--ignore-only`
it ends by printing `graphify hook status`; either way it exits 1 when the ignore was
left as it is.
"""
import subprocess
import sys
from importlib import metadata
from pathlib import Path

USAGE = "usage: graphify-hooks.py [--ignore-only]"
args = sys.argv[1:]
if args not in ([], ["--ignore-only"]):
    sys.exit(USAGE)
ignore_only = args == ["--ignore-only"]

try:
    from graphify import hooks as h
except ImportError:
    sys.exit("graphify is not importable by this Python: run it with the one "
             "graphify-out/.graphify_python names")

NEEDED = ("_git_root", "_hooks_dir", "_user_hooks_dir", "_load_graphifyrc", "_pinned_python",
          "_install_hook", "_HOOK_SCRIPT", "_CHECKOUT_SCRIPT", "_HOOK_MARKER",
          "_HOOK_MARKER_END", "_CHECKOUT_MARKER", "_CHECKOUT_MARKER_END", "status")
missing = [n for n in NEEDED if not hasattr(h, n)]
if missing:
    sys.exit("graphify's hooks module has changed (missing: " + ", ".join(missing) +
             "); nothing written")

TEMPLATE = Path(__file__).resolve().with_name("graphifyignore")
IGNORE_NAME = ".graphifyignore"
EXCLUDE_LINE = "/" + IGNORE_NAME


def place_ignore(root):
    """Place the board-file ignore in the main checkout at root: (placed, one-line result)."""
    git_dir = root / ".git"
    if not git_dir.is_dir():
        return False, "not a main checkout (a linked worktree has no graph); nothing written"
    template = TEMPLATE.read_bytes()
    target = root / IGNORE_NAME
    tracked = subprocess.run(["git", "ls-files", "--error-unmatch", IGNORE_NAME], cwd=root,
                             capture_output=True).returncode == 0
    if tracked:
        return False, "a tracked " + IGNORE_NAME + ": left as it is"
    current = target.read_bytes() if target.is_file() else None
    if current is not None and current.splitlines()[:1] != template.splitlines()[:1]:
        return False, "a " + IGNORE_NAME + " that is not the installer's: left as it is"
    exclude = git_dir / "info" / "exclude"
    text = exclude.read_bytes() if exclude.is_file() else b""
    if EXCLUDE_LINE not in [line.strip() for line in text.decode("utf-8", "replace").splitlines()]:
        nl = b"\r\n" if b"\r\n" in text else b"\n"
        if text and not text.endswith(b"\n"):
            text += nl
        exclude.parent.mkdir(parents=True, exist_ok=True)
        exclude.write_bytes(text + EXCLUDE_LINE.encode("utf-8") + nl)
    if current == template:
        return True, "already in place"
    target.write_bytes(template)
    return True, "placed" if current is None else "updated from the template"


root = h._git_root(Path("."))
if root is None:
    sys.exit("no git repository here")
if not ignore_only and not (root / "graphify-out" / "graph.json").is_file():
    sys.exit("no graphify-out/graph.json in " + str(root) + "; nothing written")

placed, ignore_result = place_ignore(root)
print("root:", root)
print("ignore:", ignore_result)
if ignore_only:
    sys.exit(0 if placed else 1)

try:
    version = metadata.version("graphifyy")
except metadata.PackageNotFoundError:
    version = "unknown"

hooks_dir = h._user_hooks_dir(h._hooks_dir(root))
cfg = h._load_graphifyrc(root)
viz_limit = cfg.get("viz_node_limit")
if viz_limit is not None:
    viz_export = f'export GRAPHIFY_VIZ_NODE_LIMIT="${{GRAPHIFY_VIZ_NODE_LIMIT:-{viz_limit}}}"\n'
else:
    viz_export = ""
pinned = h._pinned_python()
hook = h._HOOK_SCRIPT.replace("__PINNED_PYTHON__", pinned).replace("__VIZ_LIMIT_EXPORT__", viz_export)
checkout = h._CHECKOUT_SCRIPT.replace("__PINNED_PYTHON__", pinned).replace("__VIZ_LIMIT_EXPORT__", viz_export)

print("graphify:", version)
print("hooks dir:", hooks_dir)
print("post-commit:", h._install_hook(hooks_dir, "post-commit", hook, h._HOOK_MARKER, h._HOOK_MARKER_END))
print("post-checkout:", h._install_hook(hooks_dir, "post-checkout", checkout, h._CHECKOUT_MARKER,
                                        h._CHECKOUT_MARKER_END))
print(h.status(root))
if not placed:
    sys.exit(1)
