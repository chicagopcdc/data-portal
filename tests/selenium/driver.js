/**
 * Selenium WebDriver builder.
 * Responsible for:
 *  - configuring Chrome options
 *  - handling localhost certificate issues
 *  - returning a ready-to-use WebDriver instance
 */

const { Builder } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const config = require('./config');

async function buildDriver() {
  /**
   * Helper: determine whether the BASE_URL points to localhost.
   *
   * We use this to decide whether to allow self-signed / invalid certs.
   * This is critical because:
   *  - localhost often uses self-signed certs → needs overrides
   *  - prod/staging use valid certs → overrides can break navigation
   */
  function isLocalhost(url) {
    try {
      const u = new URL(url);
      return (
        u.hostname === 'localhost' ||
        u.hostname === '127.0.0.1' ||
        u.hostname.endsWith('.local')
      );
    } catch {
      // If the URL is malformed, treat it as non-localhost
      return false;
    }
  }

  /**
   * Explicit browser validation.
   * Keeps failures obvious and intentional if someone tries to
   * run with an unsupported browser.
   */
  if (config.browser !== 'chrome') {
    throw new Error(`Unsupported browser: ${config.browser}`);
  }

  /**
   * Configure Chrome runtime options.
   */
  const options = new chrome.Options();

  // Headless mode (recommended for CI)
  if (config.headless) {
    options.addArguments('--headless=new');
  }

  // Use Chrome user profile (OPTION 2)
  // TODO: WIP - need to connec
  const profileDir = process.env.CHROME_USER_DATA_DIR;
  if (profileDir) {
    options.addArguments(`--user-data-dir=${profileDir}`);
  }

  // Standard stability options
  options.addArguments('--window-size=1400,900');
  options.addArguments('--disable-gpu');
  options.addArguments('--no-sandbox');

  /**
   * IMPORTANT:
   * Only allow insecure certificates for localhost.
   *
   * Without this:
   *  - Chrome shows a "Privacy error" page
   *  - Selenium never reaches the portal app
   *
   * With this enabled on prod:
   *  - Chrome security behavior can break auth / redirects
   */
  if (isLocalhost(config.baseUrl)) {
    options.addArguments('--ignore-certificate-errors');
    options.addArguments('--allow-insecure-localhost');
    options.addArguments('--allow-running-insecure-content');
  }

  // Build the actual WebDriver instance.
  // Selenium will launch a brand-new Chrome session here.
  const driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build();

  // Disable implicit waits and rely only on explicit waits.
  await driver.manage().setTimeouts({
    implicit: 0,
    pageLoad: 60000,
    script: 30000,
  });

  return driver;
}

module.exports = { buildDriver };
