# Min Strøm API documentation

Consumer API documentation is the default experience. Enterprise API (B2B) documentation retains the existing third-party page URLs and authentication.

## Local development

Use Node.js 22.12 or newer.

CI uses Node.js 24. The CLI and OpenAPI validator are pinned; use `npm ci`, not an unpinned global CLI.

```bash
npm ci
npm run dev
```

The preview URL is printed by Mintlify. Tool versions are pinned in package.json and package-lock.json.

## Validation

```bash
npm ci
npm run check
```

This runs five native Node contract/example tests, Redocly's OpenAPI 3.1 and example validation, `mint validate`, and `mint broken-links --check-anchors --check-redirects --check-snippets`. The GitHub workflow runs the same checks. Bash examples are syntax-checked without executing HTTP requests. Tests protect the seven-operation allowlist, query names, response keys/nullability, sparse-data examples, and Consumer/Enterprise navigation.

The specification lives only at `api-reference/openapi.json`. Its reviewed response shapes correspond to `PersonalAPIDataResponse.swift` and `PersonalAPISeriesMapper.swift` in the backend; this is not an automatic cross-repository schema comparison. Keep those in sync when changing responses. All new examples are synthetic.

Tooling documentation: [Mintlify CLI](https://www.mintlify.com/docs/cli/commands) and [site configuration](https://www.mintlify.com/docs/organize/settings).

The current pinned Mintlify development dependency tree reports 14 npm audit findings (12 high, two moderate); there are no production-package findings. Do not apply `npm audit fix --force`: its suggested Mintlify downgrade is not a validated fix for this site. Reassess upstream tooling updates separately. Preview only trusted documentation locally; do not expose the development server publicly.

## Review and publication

Validate locally before pushing. Review both navigation tabs, existing Enterprise links, endpoint pages, light/dark themes, and mobile layout.

The main branch publishes automatically to Mintlify. Work on a branch and do not merge until the production Consumer API routes and documented iOS access flow are available. Do not commit real credentials or personal data.

Release order:

1. Review the backend route change into `codex/personal-api` and the docs change into this repository's `main` independently.
2. Make the seven `/consumer/v1` routes available in the intended production release. `/personal/v1` is retired without an alias; `/thirdParty` and credential-management paths are unchanged.
3. Confirm the released iOS app exposes Profile → API-adgang → Opret API-nøgle to eligible users, including the relevant feature gate. Labels were checked in the iOS source; source presence alone does not establish release availability.
4. Complete the backend initiative's deployment prerequisites, including Redis connection headroom. With an explicitly approved test key, smoke-test credential creation, address discovery, and a Consumer series. No live customer account is needed for automated docs checks.
5. Run `npm run check`, preview and approve both tabs, preserved B2B URLs, all seven reference pages, mobile layout, and light/dark themes.
6. Only then merge the documentation pull request into `main`. Do not auto-merge it while the API or iOS flow is unavailable.

Implementation decisions and validation history remain in the backend's `docs/api/min-stroem-plus-personal-api-requirements.md`, the sole initiative planning record.
