"""graphify-hooks.py: install graphify's post-commit and post-checkout git hooks in the
repository at the current directory, as `graphify hook install` builds them, without its
merge-driver step.

That step registers a git merge driver for graph.json and appends a line to the
repository's root .gitattributes, a tracked file. graph.json is git-ignored in these
repositories, so the driver would never run, and no repository gains a tracked file. The
rest is graphify.hooks.install() of graphify 0.9.82, built from the package's own
functions, so the hooks are the ones `graphify hook status` checks for.

Run it from the repository's main checkout with the Python that has graphify, the one
graphify-out/.graphify_python names:

    <that python> ~/.claude/admin-team/graphify/graphify-hooks.py

It refuses a folder with no graphify-out/graph.json (a linked worktree has none), and it
writes nothing when the package no longer has a function it uses. Run again, it updates
the hooks' graphify blocks in place or reports them already installed; a hook that is not
graphify's keeps its own lines, with graphify's block appended. It ends by printing
`graphify hook status`.
"""
import sys
from importlib import metadata
from pathlib import Path

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

root = h._git_root(Path("."))
if root is None:
    sys.exit("no git repository here")
if not (root / "graphify-out" / "graph.json").is_file():
    sys.exit("no graphify-out/graph.json in " + str(root) + "; nothing written")

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
print("root:", root)
print("hooks dir:", hooks_dir)
print("post-commit:", h._install_hook(hooks_dir, "post-commit", hook, h._HOOK_MARKER, h._HOOK_MARKER_END))
print("post-checkout:", h._install_hook(hooks_dir, "post-checkout", checkout, h._CHECKOUT_MARKER,
                                        h._CHECKOUT_MARKER_END))
print(h.status(root))
