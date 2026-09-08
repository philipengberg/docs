# Min Strøm API documentation

Consumer API documentation is the default experience. Enterprise API (B2B) documentation retains the existing third-party page URLs and authentication.

## Local development

Use Node.js 22.12 or newer.

```bash
npm ci
npm run dev
```

The preview URL is printed by Mintlify. Tool versions are pinned in package.json and package-lock.json.

## Review and publication

Validate locally before pushing. Review both navigation tabs, existing Enterprise links, endpoint pages, light/dark themes, and mobile layout.

The main branch publishes automatically to Mintlify. Work on a branch and do not merge until the production Consumer API routes and documented iOS access flow are available. Do not commit real credentials or personal data.
