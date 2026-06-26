# Selenium E2E Tests

This folder contains Selenium-based end-to-end (E2E) tests for the PCDC Data Portal.

The tests are written using:

- `selenium-webdriver`
- `mocha`
- `chai`

They are intended to validate critical user workflows and guard against UI regressions.

## Notes on test design

- Tests prefer `until.elementLocated` over visibility checks where possible.
  - This avoids false timeouts in React where elements may exist in the DOM but are not yet visible due to transitions or re-renders.
- Tests are written defensively to handle:
  - duplicate DOM nodes
  - responsive layouts
  - late-rendered overlays
- Tests should be resilient across local, dev, and higher environments.

## Prerequisites

- Node.js (LTS recommended)
- Google Chrome installed
- npm

## Folder structure

```bash
tests/
  selenium/
    integration_tests/
      smoke.spec.js
      versionFooter.spec.js
      dictionary.spec.js
  package.json
  README.md
```

## Install dependencies

From the `selenium/` directory:

```bash
npm install
```

### Environment variables

The following environment variables are commonly used:

```bash
Variable	Description
BASE_URL	Base URL of the portal (e.g. https://localhost, https://portal-dev.pedscommons.org)
HEADLESS	If set to true, runs Chrome in headless mode
CHROME_USER_DATA_DIR	Optional Chrome profile directory (useful for SSO / cached auth)
```

Example:

```bash
BASE_URL=https://localhost npm test
```

### Run all tests

```bash
npm test
```

Equivalent to:

```bash
mocha "src/tests/**/*.spec.js" --timeout 120000
```

Run tests in headless mode

```bash
HEADLESS=true npm test
```

_This is useful for CI or quick local runs without opening a browser window._

- Run a single test by name (grep)
- Use Mocha’s -g flag to match the test description:

```bash
BASE_URL=https://localhost npm test -- -g "Data Dictionary"
```

_This is helpful when you only want to execute a single describe() block._

### Run a specific test file

Several npm scripts are provided for common test files:

```bash
npm run test:dictionary
npm run test:version
npm run test:smoke
```

_(See package.json for the full list.)_

### Skipping tests

To temporarily skip a test file, rename it so it no longer matches \*.spec.js:

```bash
dictionary.spec.js.skip
```

This is preferable to commenting out tests.

### Debugging tips

- Run non-headless when debugging locally
- Add temporary sleep() calls if diagnosing timing issues
- Use CHROME_USER_DATA_DIR if authentication or SSO is required
- Prefer adjusting waits (T, T_SLOW) over adding brittle selectors

#### CI considerations

- Headless mode is recommended
- Avoid relying on cached browser state unless explicitly configured
- Tests should be environment-agnostic and idempotent
