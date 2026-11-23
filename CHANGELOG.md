# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- The rule checker reads a level the register declares under a root, a segment with no folder,
  file or id (`"levels"`), a folder of another repository (a repository's `"folders"`), and a
  file of a third repository in that folder, as `Structure.md` states them under Files and
  folders.

### Changed

- The rule checker no longer reads the register's list of files not yet converted
  (`"notConverted"`): every registered file is read whole, and a register that still holds the
  key is refused.
- The rule checker's `--write` retires the own id of a pointer that is gone, or repointed at
  another target, on its target's list (`{ "by": <its new id> }`, or `{ "by": null }`), where
  it took the id off the list; a retired id is never given again, and `--pointers-at` lists the
  ids retired on a list with what replaced them.
