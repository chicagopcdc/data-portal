/**
 * Load environment variables from a .env file (if present).
 * This allows us to control base URL, credentials, headless mode, etc.
 * without hardcoding anything into the test code.
 */
require('dotenv').config();

module.exports = {
  /**
   * Base URL Selenium should open.
   *
   * Examples:
   *  - https://localhost/dev.html        (local dev)
   *  - https://portal-staging.pedscommons.org
   *  - https://portal.pedscommons.org
   *
   * NOTE: Selenium launches its own browser, so this URL must be
   * directly reachable by that browser.
   */
  baseUrl: process.env.BASE_URL || 'https://localhost',

  /**
   * Optional portal credentials.
   * These are intentionally empty by default.
   *
   * - For local testing, these can come from .env
   * - For CI, these should come from secrets
   * - Tests that don’t require login can ignore them
   */
  username: process.env.PORTAL_USER || '',
  password: process.env.PORTAL_PASS || '',

  /**
   * Whether to run Chrome in headless mode.
   *
   * Default: true
   * - true  → CI / automated runs
   * - false → local debugging (watch the browser)
   */
  headless: (process.env.HEADLESS || 'true').toLowerCase() === 'true',

  /**
   * Browser selection.
   * Currently only Chrome is supported.
   * This is defined here to make future expansion explicit.
   */
  browser: process.env.BROWSER || 'chrome',

  /**
   * Default timeout (ms) for explicit waits.
   * Used everywhere Selenium waits for elements to appear.
   */
  timeoutMs: Number(process.env.TIMEOUT_MS || 15000),
};
