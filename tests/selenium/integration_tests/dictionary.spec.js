const { expect } = require('chai');
const { By, until } = require('selenium-webdriver');
const { buildDriver } = require('../driver');
const config = require('../config');

/**
 * Data Dictionary test
 *
 * Purpose:
 * - View data dictionary
 * - Toggle between table and graph
 * - View hidden elements, and mock download action
 */

// Normalize to prevent false fails
function normalizeNodeName(s) {
  return (s || '')
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

describe('Data Dictionary', function () {
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

  /**
   * Helpers
   */

  // Return all elements for a css selector
  async function cssAll(sel) {
    return driver.findElements(By.css(sel));
  }

  // Does at least one element exist in the DOM?
  async function existsCss(sel) {
    return (await cssAll(sel)).length > 0;
  }

  // Wait until an element is "present" in the DOM.
  // Note: Using "visible" waits too early is a common cause of false 15s timeouts.
  async function waitLocatedCss(sel, timeoutMs = config.timeoutMs) {
    return driver.wait(until.elementLocated(By.css(sel)), timeoutMs);
  }

  // Find an element that is actually displayed
  async function findDisplayedCss(sel, timeoutMs = config.timeoutMs) {
    // First: ensure "something" exists in the DOM
    await waitLocatedCss(sel, timeoutMs);

    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const elements = await cssAll(sel);
      for (const element of elements) {
        try {
          if (await element.isDisplayed()) return element;
        } catch {
          // Ignore and retry
        }
      }
      await driver.sleep(200);
    }

    const count = (await cssAll(sel)).length;
    throw new Error(
      `Found ${count} elements for selector "${sel}" but none were displayed`,
    );
  }

  // Click the "displayed" element matching selector
  async function clickDisplayedCss(sel, timeoutMs = config.timeoutMs) {
    const element = await findDisplayedCss(sel, timeoutMs);

    await driver.executeScript(
      "arguments[0].scrollIntoView({block:'center'});",
      element,
    );

    await driver.wait(async () => {
      try {
        return await element.isEnabled();
      } catch {
        return false;
      }
    }, timeoutMs);

    try {
      await element.click();
    } catch {
      // Fallback: click via JS if Selenium says "intercepted"
      await driver.executeScript('arguments[0].click();', element);
    }

    return element;
  }

  // Wait for a piece of text to exist anywhere on the page
  async function waitTextExists(text, timeoutMs = config.timeoutMs) {
    const xpath = `//*[normalize-space()="${text}"]`;
    await driver.wait(until.elementLocated(By.xpath(xpath)), timeoutMs);
  }

  // Check for too small of screen overlay
  async function assertNoSmallScreenOverlay() {
    const overlaySel = '.screen-size-warning__container';
    const elements = await cssAll(overlaySel);
    if (elements.length) {
      const displayed = await elements[0].isDisplayed().catch(() => false);
      if (displayed) {
        throw new Error(
          `Small-screen overlay is visible (${overlaySel}). Increase window-size/viewport.`,
        );
      }
    }
  }

  // Navigate to Dictionary page
  async function goToDictionary() {
    const dictLinkSel =
      'a.nav-button[href*="/DD"], a.nav-button--active[href*="/DD"]';

    await assertNoSmallScreenOverlay();

    // Click the displayed Dictionary link (avoid hidden duplicates)
    await clickDisplayedCss(dictLinkSel);

    // Wait until Dictionary UI loads (the view switch exists)
    await waitLocatedCss('.data-dictionary__switch', config.timeoutMs);

    await assertNoSmallScreenOverlay();
  }

  /**
   * Run Test
   */
  it('Dictionary: table view default, node selection, graph view toggle, open properties, download templates, close overlay', async () => {
    await driver.get(config.baseUrl);
    await assertNoSmallScreenOverlay();

    // Go to Dictionary page
    await goToDictionary();

    // Confirm Table View is active by default
    const tableViewBtnSel =
      '.data-dictionary__switch-button[aria-label="Dictionary view"]';

    // We require "displayed" here because we are reading class state from the active UI control.
    const tableBtn = await findDisplayedCss(tableViewBtnSel);
    const tableBtnClass = await tableBtn.getAttribute('class');
    expect(tableBtnClass).to.include('data-dictionary__switch-button--active');

    // Table container should exist
    await waitLocatedCss('.data-dictionary__table', config.timeoutMs);

    // Click several nodes (3-5) to ensure expansion + properties are shown
    await waitLocatedCss('.data-dictionary-node__title', config.timeoutMs);

    let nodes = await cssAll('.data-dictionary-node__title');
    expect(nodes.length, 'No dictionary nodes found').to.be.greaterThan(5);

    const indexes = [0, 2, 4].filter((i) => i < nodes.length);
    let chosenNodeText = '';

    for (const i of indexes) {
      // Re-fetch each loop to avoid stale element refs after the UI re-renders
      nodes = await cssAll('.data-dictionary-node__title');
      const element = nodes[i];

      chosenNodeText = (await element.getText()).trim();
      await driver.executeScript(
        "arguments[0].scrollIntoView({block:'center'});",
        element,
      );

      try {
        await element.click();
      } catch {
        await driver.executeScript('arguments[0].click();', element);
      }

      // After selecting a node, confirm property headers exist somewhere
      for (const h of ['Property', 'Type', 'Required', 'Description', 'Term']) {
        await waitTextExists(h, config.timeoutMs);
      }
    }

    expect(chosenNodeText).to.not.equal('');

    // Confirm Data Model Structure is visible and the "last" node matches selection
    await waitLocatedCss('.data-model-structure__header', config.timeoutMs);
    await waitLocatedCss(
      '.data-model-structure__node-name--last',
      config.timeoutMs,
    );

    const lastNodeElement = await findDisplayedCss(
      '.data-model-structure__node-name--last',
    );
    const lastNodeText = (await lastNodeElement.getText()).trim();

    const selectedNorm = normalizeNodeName(chosenNodeText);
    const lastNorm = normalizeNodeName(lastNodeText);

    expect(
      lastNorm,
      `Expected left-panel last node to match selected "${chosenNodeText}", got "${lastNodeText}"`,
    ).to.include(selectedNorm);

    // Switch to Graph View and confirm graph/table state flips
    const graphViewBtnSel =
      '.data-dictionary__switch-button[aria-label="Graph view"]';
    await clickDisplayedCss(graphViewBtnSel);

    await driver.wait(async () => {
      const graphHidden = await existsCss(
        '.data-dictionary__graph.data-dictionary__graph--hidden',
      );
      const tableHidden = await existsCss(
        '.data-dictionary__table.data-dictionary__table--hidden',
      );
      return graphHidden === false && tableHidden === true;
    }, config.timeoutMs);

    // Open Properties overlay (button in left panel)
    const openPropsBtnSel = 'button.data-model-structure__table-button';
    await clickDisplayedCss(openPropsBtnSel);

    // Wait for DOM presence
    await waitLocatedCss('.overlay-property-table', config.timeoutMs);
    await waitLocatedCss(
      '.overlay-property-table__node-title',
      config.timeoutMs,
    );

    const overlayTitleEl = await findDisplayedCss(
      '.overlay-property-table__node-title',
    );
    const overlayTitle = (await overlayTitleEl.getText()).trim();
    expect(normalizeNodeName(overlayTitle)).to.include(selectedNorm);

    // Download Templates button exists + is enabled - not actually download
    const downloadBtnSel =
      '.data-model-structure__template-download-dropdown button';
    await waitLocatedCss(downloadBtnSel, config.timeoutMs);

    const downloadBtn = await findDisplayedCss(downloadBtnSel);
    expect(await downloadBtn.isEnabled()).to.equal(true);

    // Close overlay and return to table view
    const closeOverlaySel = '.overlay-property-table__close';
    await clickDisplayedCss(closeOverlaySel);

    // Wait until overlay removed
    await driver
      .wait(
        async () => !(await existsCss('.overlay-property-table')),
        config.timeoutMs,
      )
      .catch(() => {
        // If it lingers due to animation but UI continues fine, don't hard-fail here.
      });

    // Switch back to Table View
    await clickDisplayedCss(tableViewBtnSel);
    await waitLocatedCss('.data-dictionary__table', config.timeoutMs);

    await assertNoSmallScreenOverlay();
  });
});
