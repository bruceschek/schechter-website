# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Static site for www.schechter.com (migrated from GoDaddy), hosted on AWS Amplify. There is no build step, bundler, linter, or test suite. Pages are hand-written HTML sharing `src/styles.css`.

## Commands

- `npm start` — serves `src/` at http://localhost:3000 via `src/server.js` (a minimal static Node server, no dependencies).
- Deploy: Amplify publishes `src/` as-is (`amplify.yml`, `baseDirectory: src`) on push to GitHub.

## Architecture

- **`src/`** is the entire deployed site. Backend code is *not* deployed by Amplify.
- **Contact form** (`src/contact.html`) calls a standalone Lambda, `schechter-contact` (us-west-2, Node), whose source of truth is `lambda/contact/index.js`. Its Function URL is hardcoded in `contact.html`. Deploy it manually with the `aws lambda update-function-code` steps in `lambda/contact/README.md`; editing `index.js` does nothing until deployed. `infrastructure/lambda/contact-form/` is the original Python version of the same function, superseded by the Node one (per git history).
- **Memory Sprint page** (`src/memory.html`) is a browser client for a separate backend (the MemoryApp project, also used by an iOS app). It signs in via Cognito (`amazon-cognito-identity-js` from CDN) and POSTs `{ "text_from_user": ... }` with the ID token as a Bearer header to the API Gateway `/memory` endpoint, then shows `reply_to_user`. Config (API URL, pool and client IDs) is constants at the top of its `<script>`.
  - `docs/memory-api.openapi.yaml` is a byte-identical **replica** of the authoritative spec in `~/dev/projects/0062-memory [s008]/MemoryApp/memory03-rawpython/openapi.yaml`. Never edit the replica by hand or touch MemoryApp; refresh it with the `/sync-memory-api-spec` skill (`.claude/skills/sync-memory-api-spec`), which also lists which contract changes require edits to `memory.html`.
  - The fetch must use `credentials: 'omit'` because the API's CORS is `Access-Control-Allow-Origin: *`.
  - `handoff/` holds prompts and templates written for the MemoryApp project (e.g. the API Gateway OPTIONS/CORS fix), not code used here.
- `src/test.html` is a scratch/test page.
- `docs/` also holds source documents (About Me .docx files) and a large site archive zip that is gitignored.
