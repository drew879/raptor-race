# Raptor Race

A portrait-mode 3D runner for phones: you're a Velociraptor hunting a Protoceratops across the Gobi. Built with
TypeScript, Three.js and Vite; all art and audio are generated in code.

**Play:** https://drew879.github.io/raptor-race/ (on iPhone: Share, then Add to Home Screen, for a full-screen
app with its own icon; turn the ringer on for sound).

## GitHub Pages

`.github/workflows/pages.yml` type-checks, tests, builds and deploys `dist/` on every push to the working branch
or `main`. One-time setup on GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**. All
paths are relative, so the game runs from the `/raptor-race/` project URL.

## Development

See `CLAUDE.md` for commands and `docs/` for the design, art, audio and tech notes.
