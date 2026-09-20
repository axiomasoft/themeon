# Release verification and trusted publishing

CI and release share one verification definition. Publish authority is a separate job
with empty default permissions, an OIDC token only on that job, and a protected
`release` environment. This document describes the repository plumbing that is already
in place and the owner-executed npm/GitHub settings that still wait on gate
`NPM-TRUSTED-PUBLISHER`.

## Pipeline

`verify.yml` is the reusable workflow. It installs with a frozen lockfile, then runs
`pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, Playwright Chromium plus
`pnpm test:int`, and `pnpm check:pack` on Node 22 and Node 24. Later items may add
named gates to this same reusable file; they are not required for P0.4.

`ci.yml` calls that workflow on `push` to `main` and on `pull_request`. It then runs
three named extra jobs that are not hidden behind a generic green check:

| Job | When | Why it stays separate |
|:--|:--|:--|
| `integration-slow` | after verify | Slow browser/e2e lane |
| `codeql` | push and pull_request | TypeScript SAST |
| `scorecard` | push to `main` only | OpenSSF supply-chain score |

`release.yml` runs only on `push` to `main` and `workflow_dispatch`. It never uses a
`pull_request` trigger. It calls the same `verify.yml` at the same commit, then:

1. Packs every workspace package, diffs packed `name` / `license` / `type` /
   `publishConfig` against the workspace manifests, and uploads the tarballs.
2. Generates an SPDX SBOM and uploads it as an artifact.
3. Runs Changesets publish only when `github.ref == 'refs/heads/main'` and the event
   is not a pull request, inside the `release` environment, with
   `id-token: write`.

Local equivalent of the reusable verify path:

```bash
pnpm build && pnpm lint && pnpm typecheck && pnpm test && pnpm test:int && pnpm check:pack
mkdir -p /tmp/themeon-pack-inspect && rm -f /tmp/themeon-pack-inspect/*.tgz && pnpm -r --filter "./packages/*" pack --pack-destination /tmp/themeon-pack-inspect
```

`pnpm test:int:slow` remains the explicit slow lane.

## Permissions

Workflow-level `permissions` are empty. Jobs raise only what they need:

- verify / pack-inspect / sbom / integration-slow: `contents: read`
- CodeQL: `contents: read`, `security-events: write`
- Scorecard: `contents: read`, `actions: read`, `id-token: write`, `security-events: write`
- publish: `contents: write`, `pull-requests: write`, `id-token: write`

`id-token: write` is not granted to verify, pack, SBOM, or pull-request jobs.

## Action pins

Third-party actions use a full commit SHA and a version comment. Dependabot's
`github-actions` ecosystem opens weekly PRs that refresh those pins.

## Token fallback (current) versus trusted publishing (gated)

The publish job still sets `NODE_AUTH_TOKEN` from `secrets.NPM_TOKEN` and still
passes `registry-url` to `actions/setup-node`. That fallback stays until the owner
gate is granted and npm trusted publishing is proven. The repository does not rotate
or delete `NPM_TOKEN` in this item.

OIDC is already requested on the publish job so the workflow is provenance-ready
once npmjs trusts `release.yml`.

After trusted publishing is live, remove **both** `registry-url` and
`NODE_AUTH_TOKEN` together. Leaving `registry-url` without a token writes an empty
`_authToken` and npm then skips OIDC (`ENEEDAUTH`). Do not add `--provenance`; npm
CLI 11.5.1+ emits provenance automatically for public packages from this public
repository.

## Owner-executed external configuration

Gate `NPM-TRUSTED-PUBLISHER` covers only these settings. It does not authorize a
version bump, tag, or package publish.

### 1. GitHub environment `release`

Create environment `release` on `axiomasoft/themeon` with:

- required reviewers (repository owner)
- deployment branches limited to `main`
- no wait timer unless the owner wants one

The workflow already references `environment: release`. GitHub currently has only
`github-pages`. An unprotected auto-created environment is not this control.

Evidence without a publish: `gh api repos/axiomasoft/themeon/environments/release`
shows protection rules and a `main`-only branch policy.

### 2. npm trusted publisher for every `@themeon/*` package

On npmjs.com, for each public package (`core`, `cli`, `css`, `colors`, `vite`,
`vue`, `nuxt`, `tailwind`, `naive`), add GitHub Actions trusted publisher:

| Field | Value |
|:--|:--|
| Organization or user | `axiomasoft` |
| Repository | `themeon` |
| Workflow filename | `release.yml` |
| Environment name | `release` |
| Allowed actions | include `npm publish` (Changesets calls it) |

Use only the filename, including `.yml`. npm validates the **calling** workflow
name, so do not register `verify.yml`.

Evidence without a publish: each package Settings → Trusted publishing lists that
exact GitHub workflow and environment. npm does not verify the row until a real
publish; transcription mistakes surface only then.

### 3. Restrict tokens after a successful OIDC publish

Only after one successful trusted-publisher publish:

1. Package Settings → Publishing access → require 2FA and disallow tokens.
2. Revoke the automation `NPM_TOKEN` and delete the GitHub secret.
3. Remove `registry-url` and `NODE_AUTH_TOKEN` from `release.yml` in a follow-up
   commit.

This item does not perform that revocation.

## Rollback

If OIDC publish fails after the gate:

1. Keep `secrets.NPM_TOKEN` and the `NODE_AUTH_TOKEN` / `registry-url` pair.
2. Leave `id-token: write` in place; it is unused when a token is present.
3. Do not delete the npm trusted-publisher rows until token publish works again.
4. Re-run `workflow_dispatch` only from `main`. The publish job still no-ops on any
   other ref.

Revert of this repository change is a normal git revert of the workflow files. It
does not unpublish a package.

## What this item does not do

- No version bump, changeset consumption, git tag, or npm publish.
- No widening of GitHub organization policy.
- No paid security product.
- No change to package runtime contents. Pack is inlined in `release.yml`; local
  verify is the six host-safe commands above.
