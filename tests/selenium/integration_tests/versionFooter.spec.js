const { expect } = require('chai');
const { By, until } = require('selenium-webdriver');
const { buildDriver } = require('../driver');
const config = require('../config');

/**
 * Release version footer test
 *
 * Purpose:
 * - Print "all" footer entries (label/value) without hardcoding counts or versions
 */
describe('Release version footer', function () {
  this.timeout(120000);

  let driver;

  before(async () => {
    driver = await buildDriver();

    // Prevent responsive overlays / hidden footers due to tiny viewport
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

  // Wait until an element is present in the DOM
  async function waitLocatedCss(sel, timeoutMs = config.timeoutMs) {
    return driver.wait(until.elementLocated(By.css(sel)), timeoutMs);
  }

  // Scroll an element into view - footer at bottom
  async function scrollIntoViewCenter(el) {
    await driver.executeScript(
      "arguments[0].scrollIntoView({block:'center'});",
      el,
    );
  }

  it('prints all footer version info entries (label = value)', async () => {
    await driver.get(config.baseUrl);

    const areaSel = 'div.footer__version-info-area';

    // Wait for the footer area to exist in the DOM
    const area = await waitLocatedCss(areaSel, config.timeoutMs);

    // Scroll to it so it has a chance to render / hydrate
    await scrollIntoViewCenter(area);

    // Now it should become visible
    await driver.wait(until.elementIsVisible(area), config.timeoutMs);

    const rowSel = `${areaSel} div.footer__version-info`;
    const rows = await driver.findElements(By.css(rowSel));

    expect(rows.length, 'No footer version info rows found').to.be.greaterThan(
      0,
    );

    console.log('FOOTER VERSION INFO:');
    for (const row of rows) {
      // Label is the <span> text inside the row
      let label = '';
      const labelEls = await row.findElements(By.css('span'));
      if (labelEls.length > 0) {
        label = (await labelEls[0].getText()).trim();
      }

      // Value: prefer link text if present (e.g., Help email), otherwise parse row text
      let value = '';
      const linkEls = await row.findElements(By.css('a'));
      if (linkEls.length > 0) {
        value = (await linkEls[0].getText()).trim();
      } else {
        const rowText = (await row.getText()).trim(); // e.g. "Portal Version: 1.45.0"
        value = label ? rowText.replace(label, '').trim() : rowText;
      }

      if (!label) label = '(unknown label)';
      console.log(`${label} = ${value}`);
    }
  });
});
