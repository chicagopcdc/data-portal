const { expect } = require('chai');
const { By, until } = require('selenium-webdriver');
const { buildDriver } = require('../driver');
const config = require('../config');

/**
 * Export to PFB test
 *
 * Purpose:
 * - Navigate to Explorer
 * - Click "Export to PFB"
 * - Confirm the export toaster appears
 * - Click "Close" on the toaster
 *
 */

const T = config.timeoutMs || 30000;
const T_SLOW = T * 2; // export/toaster can lag slightly depending on environment

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForLocated(driver, locator, timeout = T) {
  return await driver.wait(until.elementLocated(locator), timeout);
}

async function waitForVisible(driver, locator, timeout = T) {
  const el = await waitForLocated(driver, locator, timeout);
  await driver.wait(until.elementIsVisible(el), timeout);
  return el;
}

async function safeClick(driver, elOrLocator, timeout = T) {
  const el =
    typeof elOrLocator?.using === 'function'
      ? await waitForVisible(driver, elOrLocator, timeout)
      : elOrLocator;

  await driver.wait(until.elementIsEnabled(el), timeout);

  try {
    await el.click();
  } catch (e) {
    // Fallback: click via JS if Selenium says "intercepted"
    await driver.executeScript('arguments[0].click();', el);
  }
}

/**
 * Helpers
 */

async function goToExplorer(driver) {
  // Navigate directly to Explorer
  await driver.get(`${config.baseUrl}/explorer`);

  // Confirm Explorer page has loaded (Export button group exists)
  await waitForLocated(
    driver,
    By.css('.explorer-visualization__button-group'),
    T,
  );
}

async function clickExportToPfb(driver) {
  // Export button in visualization button group
  const exportBtn = await waitForVisible(
    driver,
    By.xpath(
      `//div[contains(@class,'explorer-visualization__button-group')]//button[normalize-space(.)='Export to PFB']`,
    ),
    T_SLOW,
  );

  // Export should be enabled (primary). If it becomes disabled in some states,
  // this will surface early.
  const klass = (await exportBtn.getAttribute('class')) || '';
  expect(klass).to.include('g3-button--primary');

  await safeClick(driver, exportBtn, T_SLOW);
}

async function waitForExportToaster(driver) {
  // Toast container that appears at bottom of screen
  const toaster = await waitForVisible(
    driver,
    By.css('.explorer-button-group__toaster-div.toaster__div'),
    T_SLOW * 2,
  );

  // Confirm toaster text is present
  const textEl = await waitForVisible(
    driver,
    By.css(
      '.explorer-button-group__toaster-div .explorer-button-group__toaster-text',
    ),
    T_SLOW,
  );
  const text = (await textEl.getText()) || '';
  expect(text.toLowerCase()).to.include('export');
  expect(text.toLowerCase()).to.include('progress');

  return toaster;
}

async function closeExportToaster(driver) {
  // Close button inside toaster
  const closeBtn = await waitForVisible(
    driver,
    By.css(
      '.explorer-button-group__toaster-div button.explorer-button-group__toaster-button',
    ),
    T_SLOW,
  );

  expect((await closeBtn.getText()).trim()).to.equal('Close');
  await safeClick(driver, closeBtn, T_SLOW);

  // Wait until toaster is gone
  await driver.wait(async () => {
    const els = await driver.findElements(
      By.css('.explorer-button-group__toaster-div.toaster__div'),
    );
    return els.length === 0;
  }, T_SLOW * 2);
}

describe('Export to PFB', function () {
  this.timeout(Math.max(T_SLOW * 4, 120000));

  let driver;

  before(async () => {
    driver = await buildDriver();

    // Portal shows an overlay if screen is to small
    // (Match survival.spec.js style; ignore if unsupported)
    try {
      await driver.manage().window().setRect({
        width: 1600,
        height: 1000,
        x: 0,
        y: 0,
      });
    } catch {
      // Ignore if unsupported
    }
  });

  after(async () => {
    if (driver) await driver.quit();
  });

  /**
   * Run Test
   */
  it('exports to PFB and closes the export toaster', async () => {
    // Go to Explorer
    await goToExplorer(driver);

    // Click Export to PFB
    await clickExportToPfb(driver);

    // Export toaster should appear at bottom of screen
    await waitForExportToaster(driver);

    // Close the toaster
    await closeExportToaster(driver);

    // Small settle time (prevents rare flake if UI re-renders after close)
    await sleep(250);
  });
});
