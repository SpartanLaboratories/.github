# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- The rule checker reads a level the register declares under a root, a segment with no folder,
  file or id (`"levels"`), a folder of another repository (a repository's `"folders"`), and a
  file of a third repository in that folder, as `Structure.md` states them under Files and
  folders.
