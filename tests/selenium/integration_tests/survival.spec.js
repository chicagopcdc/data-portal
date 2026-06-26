const { expect } = require('chai');
const { By, until } = require('selenium-webdriver');
const { buildDriver } = require('../driver');
const config = require('../config');

/**
 * Survival Analysis test
 *
 * Purpose:
 * - Open Survival Analysis view in Explorer
 * - Confirm returning-user terms flow (Continue)
 * - Confirm default Survival type (Overall Survival)
 * - Create two Filter Sets (cohorts) from Subject filters and save them
 * - Add Filter Sets to survival analysis and Apply to render plot + risk table
 * - Switch Survival type to EFS and Apply again
 * - Clear selections using the "x" on each Filter Set card
 * - Add two Filter Sets again, Apply, then Reset
 */

const T = config.timeoutMs || 30000;
const T_SLOW = T * 2; // survival plots/tables can be slower

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

async function openFilterGroupTab(driver, tabTitle) {
  const tab = await waitForVisible(
    driver,
    By.xpath(
      `//p[contains(@class,'g3-filter-group__tab-title') and normalize-space(.)='${tabTitle}']`,
    ),
    T,
  );
  await safeClick(driver, tab, T);
}

async function expandFilterSection(driver, sectionTitle) {
  const containerXpath = `//div[contains(@class,'g3-filter-section__title-container') and (contains(@aria-label,'filter: ${sectionTitle}') or contains(.,'${sectionTitle}'))]`;
  const container = await waitForVisible(driver, By.xpath(containerXpath), T);
  await safeClick(driver, container, T);
}

async function selectSingleSelectOption(driver, labelText) {
  const rowXpath = `//div[contains(@class,'g3-single-select-filter')]//*[normalize-space(.)='${labelText}']/ancestor::div[contains(@class,'g3-single-select-filter')]`;
  const row = await waitForVisible(driver, By.xpath(rowXpath), T);
  await safeClick(driver, row, T);
}

async function openSaveFilterSetModal(driver) {
  const saveBtn = await waitForVisible(
    driver,
    By.xpath(
      `//button[contains(@class,'explorer-filter-set-workspace__action-button') and normalize-space(.)='Save']`,
    ),
    T,
  );
  await safeClick(driver, saveBtn, T);
}

async function saveFilterSet(driver, { name, description }) {
  // Fill in name + description, then save
  const nameInput = await waitForVisible(
    driver,
    By.css('#create-filter-set-name'),
    T,
  );
  await nameInput.clear();
  await nameInput.sendKeys(name);

  const descInput = await waitForVisible(
    driver,
    By.css('#create-filter-set-description'),
    T,
  );
  await descInput.clear();
  await descInput.sendKeys(description || '');

  const saveModalBtn = await waitForVisible(
    driver,
    By.xpath(
      `//button[contains(@class,'g3-button--primary') and normalize-space(.)='Save Filter Set']`,
    ),
    T,
  );
  await safeClick(driver, saveModalBtn, T);

  // Give time for modal animation + saved state to settle
  await sleep(800);
}

async function clearWorkspace(driver) {
  // Clear current filter workspace selections (prevents filters from carrying over to next cohort)
  const clearBtn = await waitForVisible(
    driver,
    By.xpath(
      `//button[contains(@class,'explorer-filter-set-workspace__action-button') and normalize-space(.)='Clear']`,
    ),
    T,
  );
  await safeClick(driver, clearBtn, T);
  await sleep(600);
}

async function goToSurvivalAnalysis(driver) {
  // Navigate to Explorer then switch view to Survival Analysis
  await driver.get(`${config.baseUrl}/explorer`);

  const survivalBtn = await waitForVisible(
    driver,
    By.xpath(
      `//button[normalize-space(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'))='survival analysis']`,
    ),
    T,
  );
  await safeClick(driver, survivalBtn, T);

  // Wait until Survival Analysis UI loads
  await waitForLocated(driver, By.css('.explorer-survival-analysis'), T);
}

async function handleReturningUserTerms(driver) {
  // Returning users see a short terms panel + Continue
  const continueBtn = await waitForVisible(
    driver,
    By.xpath(
      `//button[contains(@class,'g3-button--primary') and normalize-space(.)='Continue']`,
    ),
    T,
  );
  await safeClick(driver, continueBtn, T);

  // Confirm Survival controls are now present
  await waitForLocated(driver, By.css('input#survival-filter-sets'), T);
  await waitForLocated(driver, By.css('input#survival-type'), T);
}

// ---- NEW USER FULL DISCLAIMER (commented out) ----
// async function handleNewUserFullDisclaimer(driver) {
//   // TODO: determine how “first-time user” is tracked (cookies/localStorage/back-end), could not replicate.
// }

async function assertDefaultSurvivalTypeOverall(driver) {
  // Confirm Survival type defaults to Overall Survival
  const el = await waitForVisible(
    driver,
    By.xpath(
      `//label[@for='survival-type']/following::div[contains(@class,'css-1dimb5e-singleValue') and normalize-space(.)='Overall Survival'][1]`,
    ),
    T,
  );
  expect(await el.getText()).to.equal('Overall Survival');
}

async function reactSelectPickOptionByInputId(driver, inputId, optionText) {
  // Generic React-Select helper (open dropdown via input, pick option by role=option)
  const input = await waitForVisible(driver, By.css(`input#${inputId}`), T);
  await safeClick(driver, input, T);

  const opt = await waitForVisible(
    driver,
    By.xpath(`//*[@role='option' and normalize-space(.)='${optionText}']`),
    T,
  );
  await safeClick(driver, opt, T);
}

async function assertAddDisabledInitially(driver) {
  // Add button should be disabled until a Filter Set is selected
  const addBtn = await waitForVisible(
    driver,
    By.css('.explorer-survival-analysis__filter-set-select button'),
    T,
  );
  const klass = (await addBtn.getAttribute('class')) || '';
  expect(klass).to.include('g3-button--disabled');
}

async function addFilterSetToCurve(driver, filterSetName) {
  // Select a saved Filter Set and add it to the survival analysis selection list
  await reactSelectPickOptionByInputId(
    driver,
    'survival-filter-sets',
    filterSetName,
  );

  const addBtn = await waitForVisible(
    driver,
    By.css('.explorer-survival-analysis__filter-set-select button'),
    T,
  );
  const addClass = (await addBtn.getAttribute('class')) || '';
  expect(addClass).to.not.include('g3-button--disabled');

  await safeClick(driver, addBtn, T);

  // After Add: a filter set "card" should appear in the list
  await waitForLocated(
    driver,
    By.css('.explorer-survival-analysis__filter-set-card'),
    T,
  );
  await sleep(300);
}

async function clickApply(driver) {
  // Apply should become enabled after adding Filter Set(s)
  const applyBtn = await waitForVisible(
    driver,
    By.xpath(
      `//div[contains(@class,'explorer-survival-analysis__button-group')]//button[normalize-space(.)='Apply']`,
    ),
    T,
  );

  const klass = (await applyBtn.getAttribute('class')) || '';
  expect(klass).to.not.include('g3-button--disabled');

  await safeClick(driver, applyBtn, T);
}

async function waitForRenderedPlotAndRiskTable(driver) {
  // Confirm plot rendered (recharts SVG exists)
  await waitForLocated(
    driver,
    By.css('.explorer-survival-analysis__survival-plot .recharts-wrapper svg'),
    T_SLOW * 2,
  );

  // Confirm risk table rendered (title + recharts SVG exists)
  const titleEl = await waitForVisible(
    driver,
    By.xpath(
      `//div[contains(@class,'explorer-survival-analysis__risk-table')]//div[contains(@class,'explorer-survival-analysis__figure-title') and normalize-space(.)='Number at risk']`,
    ),
    T_SLOW * 2,
  );
  expect(await titleEl.getText()).to.equal('Number at risk');

  await waitForLocated(
    driver,
    By.css('.explorer-survival-analysis__risk-table .recharts-wrapper svg'),
    T_SLOW * 2,
  );
}

async function switchSurvivalType(driver, typeLabel) {
  // Switch the Survival type dropdown and confirm selected value updates
  await reactSelectPickOptionByInputId(driver, 'survival-type', typeLabel);

  const el = await waitForVisible(
    driver,
    By.xpath(
      `//label[@for='survival-type']/following::div[contains(@class,'css-1dimb5e-singleValue') and normalize-space(.)='${typeLabel}'][1]`,
    ),
    T,
  );
  expect(await el.getText()).to.equal(typeLabel);
}

async function clearAllSelectedFilterSetCards(driver) {
  // Clear selections using “x” on each filter set card header
  const clearButtons = await driver.findElements(
    By.css(
      ".explorer-survival-analysis__filter-set-card header button[aria-label='Clear']",
    ),
  );
  expect(clearButtons.length).to.be.greaterThan(0);

  for (const btn of clearButtons) {
    await safeClick(driver, btn, T);
    await sleep(200);
  }

  // Wait until all cards are removed
  await driver.wait(async () => {
    const cards = await driver.findElements(
      By.css('.explorer-survival-analysis__filter-set-card'),
    );
    return cards.length === 0;
  }, T);

  // After clearing, Apply should be disabled again
  const applyBtn = await waitForVisible(
    driver,
    By.xpath(
      `//div[contains(@class,'explorer-survival-analysis__button-group')]//button[normalize-space(.)='Apply']`,
    ),
    T,
  );
  const klass = (await applyBtn.getAttribute('class')) || '';
  expect(klass).to.include('g3-button--disabled');
}

async function resetSurvival(driver) {
  // Reset clears selections and disables Apply (plot may remain visible)
  const resetBtn = await waitForVisible(
    driver,
    By.xpath(
      `//div[contains(@class,'explorer-survival-analysis__button-group')]//button[normalize-space(.)='Reset']`,
    ),
    T,
  );
  await safeClick(driver, resetBtn, T);

  const applyBtn = await waitForVisible(
    driver,
    By.xpath(
      `//div[contains(@class,'explorer-survival-analysis__button-group')]//button[normalize-space(.)='Apply']`,
    ),
    T,
  );
  const klass = (await applyBtn.getAttribute('class')) || '';
  expect(klass).to.include('g3-button--disabled');
}

describe('Survival Analysis', function () {
  this.timeout(Math.max(T_SLOW * 6, 180000));

  let driver;

  before(async () => {
    driver = await buildDriver();

    // Portal shows an overlay if screen is to small
    // (Match dictionary.spec.js style; ignore if unsupported)
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
  it('creates cohorts, applies survival curve, switches survival type, clears selections, and resets', async () => {
    // Go to Survival Analysis view (Explorer)
    await goToSurvivalAnalysis(driver);

    // Returning user flow: Continue through shortened terms
    await handleReturningUserTerms(driver);

    // Confirm defaults
    await assertDefaultSurvivalTypeOverall(driver);
    await assertAddDisabledInitially(driver);

    // Create unique Filter Set names (avoid collisions across test runs)
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filterSet1 = `E2E INRG ${stamp}`;
    const filterSet2 = `E2E Female ${stamp}`;

    // Create Filter Set #1: Subject -> Consortium -> INRG
    await openFilterGroupTab(driver, 'Subject');
    await expandFilterSection(driver, 'Consortium');
    await selectSingleSelectOption(driver, 'INRG');
    await openSaveFilterSetModal(driver);
    await saveFilterSet(driver, {
      name: filterSet1,
      description: 'E2E survival cohort: INRG',
    });
    await clearWorkspace(driver);

    // Create Filter Set #2: Subject -> Sex -> Female
    await openFilterGroupTab(driver, 'Subject');
    await expandFilterSection(driver, 'Sex');
    await selectSingleSelectOption(driver, 'Female');
    await openSaveFilterSetModal(driver);
    await saveFilterSet(driver, {
      name: filterSet2,
      description: 'E2E survival cohort: Female',
    });
    await clearWorkspace(driver);

    // Add filterSet1 -> Apply -> confirm plot + Number at risk table render
    await addFilterSetToCurve(driver, filterSet1);
    await clickApply(driver);
    await waitForRenderedPlotAndRiskTable(driver);

    // Switch to EFS -> Apply again -> confirm plot + risk table still render
    await switchSurvivalType(driver, 'Event-Free Survival (EFS)');
    await clickApply(driver);
    await waitForRenderedPlotAndRiskTable(driver);

    // Clear selections using “x” on the filter set card(s)
    await clearAllSelectedFilterSetCards(driver);

    // Add two filter sets -> Apply again (curve should redraw)
    await addFilterSetToCurve(driver, filterSet1);
    await addFilterSetToCurve(driver, filterSet2);
    await clickApply(driver);
    await waitForRenderedPlotAndRiskTable(driver);

    // Reset
    await resetSurvival(driver);
  });
});
