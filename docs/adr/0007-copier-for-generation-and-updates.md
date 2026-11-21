# ADR-0007 — Copier for generation and updates

- **Status**: Accepted
- **Date**: 2026-11-21

## Context
A harness improves (and simplifies) as models change; projects generated once fall behind.

## Decision
The template is a Copier template (`_subdirectory: template`, templated `_exclude`, preserved symlinks). `copier update` applies new versions with a three-way merge.

## Options rejected
- GitHub template repository: no updates, no questions.
- Cookiecutter (+ cruft): weaker update story.

## Consequences
Generation needs Python tooling once (`uvx copier`).

## Revisit if
A Node-native tool offers equivalent three-way updates.
