---
name: sync-memory-api-spec
description: Pull the latest Memory Lambda API OpenAPI spec from the MemoryApp project, replicate it into this repo, and reconcile src/memory.html with any contract changes. Use when asked to update/refresh/sync the memory API spec or contract, or to check whether memory.html is still in sync with the backend.
---

# Sync the Memory API spec

The `src/memory.html` page ("Memory Sprint") is a browser client for the Memory
Lambda API. The **authoritative** spec lives in the separate MemoryApp project;
this repo keeps a **replica** so the website can be reasoned about and reviewed
on its own. This skill refreshes that replica and keeps `memory.html` conformant.

## Paths

- **Source of truth** (MemoryApp, read-only — do not edit):
  `~/dev/swift/008-memory/MemoryApp/memory03-rawpython/openapi.yaml`
- **Replica in this repo:**
  `docs/memory-api.openapi.yaml` (kept byte-identical to the source)
- **Client to reconcile:** `src/memory.html`

## Steps

1. **Check the source exists and diff it against the replica:**
   ```
   diff ~/dev/swift/008-memory/MemoryApp/memory03-rawpython/openapi.yaml \
        docs/memory-api.openapi.yaml
   ```
   - No output → already in sync. Report that and stop (nothing to do).
   - If the source path is missing, the MemoryApp project may have moved; search
     for `openapi.yaml` under `~/dev/swift/008-memory` and update these paths +
     this skill if it relocated. Do **not** edit anything inside MemoryApp.

2. **If they differ, read both** and summarize what changed — focus on the parts
   the client depends on (see invariants below), not just cosmetic edits.

3. **Overwrite the replica with the source** (keep it byte-identical so the next
   diff is clean):
   ```
   cp ~/dev/swift/008-memory/MemoryApp/memory03-rawpython/openapi.yaml \
      docs/memory-api.openapi.yaml
   ```

4. **Reconcile `src/memory.html`** against the new contract. The client is
   intentionally thin: it sends one raw utterance and surfaces the reply for
   every status code, so most backend changes need **no** client change. Only
   touch `memory.html` if one of these invariants moved:

   | Invariant the client relies on | Where in memory.html | Change client only if… |
   |---|---|---|
   | Request body is `{ "text_from_user": <string> }` | `postUtterance` fetch body | the request field name/shape changes |
   | Auth = Cognito **ID token** as `Authorization: Bearer` | `restoreSession` / `signIn` | the token type or header changes |
   | UserPoolId / ClientId / API URL | config consts near top of `<script>` | the pool, app client, or endpoint changes |
   | Reply read as `reply_to_user`; any non-200 = error (RFC 9457 problem+json — `reply_to_user` is a required member on every error too) | `postUtterance` | that field name changes |
   | 401 ⇒ treat as expired session | `postUtterance` | auth-failure handling changes |
   | Status set `{200,400,401,500,502,503}`; client doesn't branch on code except 401 | `postUtterance` | a new code needs distinct UX (e.g. honoring `Retry-After` on 503) |
   | Magic literals `RESET_CACHE`, `send_csv` | `exportCsv` sends `send_csv` | a literal is renamed/removed/added |
   | CORS requires `credentials: 'omit'` (ACAO `*`) | `postUtterance` fetch opts | ACAO is locked to an origin |

   New `command` enum values generally need **no** client change (the client
   doesn't branch on `command`). New magic literals or a renamed `send_csv` DO —
   update `exportCsv` and any header action.

5. **Verify** if `memory.html` changed: serve and sanity-check (see
   `/Users/.../memory.html` lives under `src/`), e.g.
   `node src/server.js` then load `http://localhost:3000/memory.html`. A live
   authenticated round-trip needs real credentials typed in a browser.

6. **Commit** the replica (and any `memory.html` changes) together, e.g.
   `Sync Memory API spec; reconcile memory.html`. Push to `origin/main` to deploy
   via Amplify. If only the replica changed (no client change), say so in the
   message.

## Notes

- The replica is reference/documentation; it is **not** served to browsers.
- Keep `docs/memory-api.openapi.yaml` an exact copy — don't add local banners, or
  the step-1 diff stops being a clean signal.
- Related context lives in the `memory-web-client` auto-memory note.
