const { expect } = require('chai');
const { By, until } = require('selenium-webdriver');
const { buildDriver } = require('../driver');
const config = require('../config');

/**
 * Smoke test
 *
 * Purpose:
 * - Verify “is the site up?” signal
 *
 * In tests to follow, "elementLocated" is used, because visible can cause false fails.
 * - "elementLocated means "present in the DOM"
 * - "visible" checks are more likely to false-timeout while React is still rendering
 */
describe('Smoke', function () {
  this.timeout(120000);

  let driver;

  before(async () => {
    driver = await buildDriver();

    // Portal shows an overlay if screen is to small
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

  it('loads the portal home page', async () => {
    await driver.get(config.baseUrl);

    // The <body>
    await driver.wait(until.elementLocated(By.css('body')), config.timeoutMs);

    // For React
    await driver.wait(until.elementLocated(By.css('#root')), config.timeoutMs);

    // Verify title is string
    const title = await driver.getTitle();
    expect(title).to.be.a('string');
  });
});
