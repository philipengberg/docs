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

This runs six native Node contract/example tests, Redocly's OpenAPI 3.1 and example validation, `mint validate`, and `mint broken-links --check-anchors --check-redirects --check-snippets`. The GitHub workflow runs the same checks. Bash examples are syntax-checked without executing HTTP requests. Tests cover the seven operations, query names, response fields, examples, navigation, and external-facing wording.

The specification lives at `api-reference/openapi.json`. Keep its descriptions and examples aligned with the current API contract. All examples use fictional data.

Tooling documentation: [Mintlify CLI](https://www.mintlify.com/docs/cli/commands) and [site configuration](https://www.mintlify.com/docs/organize/settings).

Preview trusted documentation locally; do not expose the development server publicly.

## Review and publication

Validate locally before pushing. Review both navigation tabs, existing Enterprise links, endpoint pages, light/dark themes, and mobile layout.

The main branch publishes automatically to Mintlify. Work on a branch and do not merge until the production Consumer API routes and documented iOS access flow are available. Do not commit real credentials or personal data.

Before publication, verify that the documented API and iOS key-creation flow are available, validate the docs, and obtain review approval.
