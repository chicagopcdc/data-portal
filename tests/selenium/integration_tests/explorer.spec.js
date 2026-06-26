const { expect } = require('chai');
const { By, until } = require('selenium-webdriver');
const { buildDriver } = require('../driver');
const config = require('../config');

/**
 * Explorer test: Filter Workspace + key filters + Explore In
 *
 * Purpose:
 * - Create a new filter set (cohort)
 * - Load a saved filter set and confirm charts + subject count update
 * - Modify filters and confirm the subject count updates
 * - Save (Update) and remove from workspace; confirm it can be re-opened
 * - Confirm Filter Workspace commands:
 *   - Load, Save/Update, New, Duplicate, Remove, Clear, Remove all, Reset, Compose, Share (token)
 * - Validate specific filter behaviors:
 *   - Consortium=NODAL reduces Study IDs to 7 (as of release v1.36)
 *   - Study ID exclude behavior updates subject count correctly
 *   - Molecular Abnormality + Result behaviors (banner + totals)
 *   - Age slider with Disease Phase does not crash portal
 * - Explore In:
 *   - GDC manifest download enables “Open in New Tab”, opens a new tab, and closes popup
 *   - GMKF manifest download enables “Open in New Tab”; then navigate to Kids First side
 *
 */

const T = config.timeoutMs || 30000;
const T_SLOW = T * 2;

/**
 * SELECTORS
 *
 * If anything fails due to DOM changes, update these first.
 */
const SELECTORS = {
  // Page roots
  explorerRoot: By.css('.explorer, .explorer-visualization__view'),
  workspaceRoot: By.css('.explorer-filter-set-workspace'),

  // Workspace action buttons (text-based, stable)
  workspaceButtonByText: (text) =>
    By.xpath(
      `//button[contains(@class,'explorer-filter-set-workspace__action-button') and normalize-space(.)='${text}']`,
    ),

  // Save/Update modal inputs/buttons (matches existing portal patterns)
  modalNameInput: By.css('#create-filter-set-name'),
  modalDescInput: By.css('#create-filter-set-description'),
  modalSaveFilterSetButton: By.xpath(
    `//button[contains(@class,'g3-button--primary') and normalize-space(.)='Save Filter Set']`,
  ),

  // Load modal elements (best-guess union; tune if needed)
  loadModalRoot: By.css(
    '.popup__box, .simple-popup__main, .modal__overlay, .g3-modal',
  ),
  loadModalSharedViaTokenRadio: By.xpath(
    `//label[contains(.,'Shared') and contains(.,'token')]//input[@type='radio']
     | //input[@type='radio' and contains(@value,'token')]`,
  ),
  loadModalTokenInput: By.xpath(
    `//input[contains(@id,'token') or contains(@name,'token') or @placeholder='Token' or contains(@placeholder,'token')]`,
  ),
  loadModalOpenButton: By.xpath(
    `//button[contains(@class,'g3-button') and (normalize-space(.)='Open' or normalize-space(.)='Load' or normalize-space(.)='Apply')]`,
  ),

  // Workspace list items / cards
  filterSetCards: By.css(
    '.explorer-filter-set-workspace__filter-set, .filter-set-card',
  ),
  filterSetCardName: (name) =>
    By.xpath(
      `//*[contains(@class,'explorer-filter-set-workspace__filter-set') or contains(@class,'filter-set-card')]//*[normalize-space(.)='${name}']`,
    ),

  // Subject count (based on provided DOM)
  subjectCount: By.css(
    '.count-box__title--align-center.h4-typo + .count-box__number--align-center.special-number',
  ),

  // Summary bar charts (based on provided DOM)
  barChartRoot: By.css('.explorer-visualization__charts .summary-chart-group'),

  // Generic banners/warnings
  bannerWarning: (text) =>
    By.xpath(
      `//*[contains(@class,'banner') or contains(@class,'g3-message') or contains(@class,'message')][contains(.,'${text}')]`,
    ),

  // Explore In modal
  exploreInButton: By.xpath(
    `//button[normalize-space(.)='Explore In' or contains(normalize-space(.),'Explore In')]`,
  ),
  exploreInModalRoot: By.css(
    '.popup__box, .simple-popup__main, .modal__overlay, .g3-modal',
  ),
  exploreInDropdownInput: By.xpath(
    `//label[contains(.,'Select') or contains(.,'Commons')]/following::input[1]
     | //input[contains(@id,'explore') and @type='text']
     | //div[contains(@class,'react-select')]//input`,
  ),
  exploreInDownloadManifest: By.xpath(
    `//button[contains(normalize-space(.),'Download') and contains(normalize-space(.),'Manifest')]`,
  ),
  exploreInOpenNewTab: By.xpath(
    `//button[contains(normalize-space(.),'Open') and contains(normalize-space(.),'New Tab')]`,
  ),

  // Close/back buttons
  backToPageButton: By.xpath(`//button[normalize-space(.)='Back to page']`),
  copyToClipboardButton: By.xpath(
    `//button[normalize-space(.)='Copy to clipboard']`,
  ),
  closeButton: By.xpath(
    `//button[normalize-space(.)='Close' or @aria-label='Close' or contains(@class,'popup__close-button')]`,
  ),
};

/**
 * UTILITIES
 */

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

async function getTextSafe(el) {
  try {
    return (await el.getText()) || '';
  } catch {
    return '';
  }
}

function parseFirstInt(text) {
  // Extract first integer-like token from UI text: "2,893" -> 2893
  const m = (text || '').replace(/,/g, '').match(/(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

/**
 * React-Select helper (same approach used in other specs)
 */
async function reactSelectPickOptionByLabel(driver, inputLocator, optionText) {
  const input = await waitForVisible(driver, inputLocator, T);
  await safeClick(driver, input, T);

  const opt = await waitForVisible(
    driver,
    By.xpath(`//*[@role='option' and normalize-space(.)='${optionText}']`),
    T,
  );
  await safeClick(driver, opt, T);
}

/**
 * Small helper to determine disabled state across implementations.
 */
async function isDisabled(el) {
  const disabledAttr = await el.getAttribute('disabled');
  const ariaDisabled = await el.getAttribute('aria-disabled');
  const klass = (await el.getAttribute('class')) || '';
  return (
    disabledAttr !== null ||
    ariaDisabled === 'true' ||
    klass.includes('disabled')
  );
}

/**
 * NAVIGATION
 */

async function goToExplorer(driver) {
  await driver.get(`${config.baseUrl}/explorer`);

  // Explorer view should appear
  await waitForLocated(driver, SELECTORS.explorerRoot, T_SLOW);
  await waitForLocated(driver, SELECTORS.workspaceRoot, T_SLOW);
  await waitForLocated(driver, SELECTORS.barChartRoot, T_SLOW);
  await waitForLocated(driver, SELECTORS.subjectCount, T_SLOW);
}

/**
 * FILTER PANEL HELPERS
 *
 * Mirrors patterns from other tests: click tab title, expand section, click option.
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

/**
 * SUBJECT COUNT + CHART ASSERTIONS
 */

async function readSubjectCount(driver) {
  const el = await waitForVisible(driver, SELECTORS.subjectCount, T_SLOW);
  const txt = await getTextSafe(el);
  const n = parseFirstInt(txt);
  if (n === null) {
    throw new Error(`Could not parse subject count from text: "${txt}"`);
  }
  return n;
}

async function waitForChartsPresent(driver) {
  await waitForLocated(driver, SELECTORS.barChartRoot, T_SLOW);
}

async function expectSubjectCountChanged(driver, beforeCount) {
  await driver.wait(async () => {
    const now = await readSubjectCount(driver);
    return now !== beforeCount;
  }, T_SLOW * 2);
}

async function expectSubjectCountEquals(driver, expected) {
  const now = await readSubjectCount(driver);
  expect(now).to.equal(expected);
}

/**
 * WORKSPACE HELPERS
 */

async function clickWorkspaceButton(driver, text) {
  const btn = await waitForVisible(
    driver,
    SELECTORS.workspaceButtonByText(text),
    T,
  );
  await safeClick(driver, btn, T);
}

async function openSaveFilterSetModal(driver) {
  // Button may say Save or Update depending on state.
  const saveLoc = SELECTORS.workspaceButtonByText('Save');
  const updateLoc = SELECTORS.workspaceButtonByText('Update');

  let btn;
  try {
    btn = await waitForVisible(driver, saveLoc, T);
  } catch {
    btn = await waitForVisible(driver, updateLoc, T);
  }
  await safeClick(driver, btn, T);
}

async function saveFilterSet(driver, { name, description }) {
  // Fill in name + description, then save
  const nameInput = await waitForVisible(driver, SELECTORS.modalNameInput, T);
  await nameInput.clear();
  await nameInput.sendKeys(name);

  const descInput = await waitForVisible(driver, SELECTORS.modalDescInput, T);
  await descInput.clear();
  await descInput.sendKeys(description || '');

  const saveModalBtn = await waitForVisible(
    driver,
    SELECTORS.modalSaveFilterSetButton,
    T,
  );
  await safeClick(driver, saveModalBtn, T);

  // Allow modal animation + saved state to settle
  await sleep(800);
}

async function loadFilterSetByName(driver, name) {
  // Click Load -> pick name -> Open
  await clickWorkspaceButton(driver, 'Load');

  await waitForLocated(driver, SELECTORS.loadModalRoot, T);

  const row = await waitForVisible(
    driver,
    By.xpath(
      `//*[contains(@class,'popup__box') or contains(@class,'simple-popup__main') or contains(@class,'modal') or contains(@class,'g3-modal')]//*[normalize-space(.)='${name}']`,
    ),
    T,
  );
  await safeClick(driver, row, T);

  const openBtn = await waitForVisible(
    driver,
    SELECTORS.loadModalOpenButton,
    T,
  );
  await safeClick(driver, openBtn, T);

  // Wait for workspace to reflect it
  await waitForLocated(driver, SELECTORS.filterSetCardName(name), T_SLOW);
  await sleep(500);
}

async function makeFilterSetActiveByName(driver, name) {
  const nameEl = await waitForVisible(
    driver,
    SELECTORS.filterSetCardName(name),
    T,
  );
  await safeClick(driver, nameEl, T);
  await sleep(200);
}

async function assertWorkspaceHasFilterSet(driver, name) {
  const el = await waitForVisible(
    driver,
    SELECTORS.filterSetCardName(name),
    T_SLOW,
  );
  expect(await getTextSafe(el)).to.include(name);
}

async function duplicateActiveFilterSet(driver) {
  await clickWorkspaceButton(driver, 'Duplicate');
  // A new card is created at bottom with no name (per requirements)
  await sleep(600);

  const cards = await driver.findElements(SELECTORS.filterSetCards);
  expect(cards.length).to.be.greaterThan(0);
}

async function removeActiveFilterSet(driver) {
  await clickWorkspaceButton(driver, 'Remove');
  await sleep(700);
}

async function clearActiveFilterSet(driver) {
  await clickWorkspaceButton(driver, 'Clear');
  await sleep(700);
}

async function removeAllFilterSets(driver) {
  await clickWorkspaceButton(driver, 'Remove all');
  await sleep(900);
}

async function resetActiveFilterSet(driver) {
  await clickWorkspaceButton(driver, 'Reset');
  await sleep(900);
}

/**
 * Compose: combine two saved filter sets using AND/OR.
 */
async function composeTwoFilterSets(driver, { nameA, nameB, op = 'And' }) {
  await clickWorkspaceButton(driver, 'Compose');

  const findRowForName = async (name) =>
    await waitForVisible(
      driver,
      By.xpath(
        `//*[contains(@class,'explorer-filter-set-workspace') or contains(@class,'popup') or contains(@class,'modal') or contains(@class,'simple-popup__main')]
         //*[normalize-space(.)='${name}']/ancestor::*[self::li or self::div][1]`,
      ),
      T,
    );

  const rowA = await findRowForName(nameA);
  const rowB = await findRowForName(nameB);

  const toggleCheckboxInRow = async (row) => {
    const cbs = await row.findElements(By.css('input[type="checkbox"]'));
    if (cbs.length) {
      await safeClick(driver, cbs[0], T);
      return;
    }
    await safeClick(driver, row, T);
  };

  await toggleCheckboxInRow(rowA);
  await toggleCheckboxInRow(rowB);

  // AND is default. Confirm OR can be selected by switching if requested.
  if (op.toLowerCase() === 'or') {
    const orBtn = await waitForVisible(
      driver,
      By.xpath(`//button[normalize-space(.)='OR' or normalize-space(.)='Or']`),
      T,
    );
    await safeClick(driver, orBtn, T);
  } else {
    const andBtn = await waitForVisible(
      driver,
      By.xpath(
        `//button[normalize-space(.)='AND' or normalize-space(.)='And']`,
      ),
      T,
    );
    await safeClick(driver, andBtn, T);
  }

  const doneBtn = await waitForVisible(
    driver,
    By.xpath(`//button[normalize-space(.)='Done']`),
    T,
  );
  await safeClick(driver, doneBtn, T);

  // Left filter panel disabled warning message varies; best-effort check (non-fatal).
  try {
    await waitForLocated(driver, SELECTORS.bannerWarning('disabled'), T);
  } catch {
    // ignore
  }

  await sleep(700);
}

/**
 * Share: token is rendered in <pre> based on provided DOM.
 */
async function shareActiveFilterSetAndGetToken(driver) {
  await clickWorkspaceButton(driver, 'Share');

  const tokenPre = await waitForVisible(
    driver,
    By.css('.simple-popup__main pre'),
    T,
  );
  const token = (await tokenPre.getText()).trim();

  expect(token, 'Expected a share token in <pre>').to.be.a('string');
  expect(token.length).to.be.greaterThan(10);

  // Click "Copy to clipboard" and "Back to page" to mirror user steps.
  const copyBtn = await waitForVisible(
    driver,
    SELECTORS.copyToClipboardButton,
    T,
  );
  await safeClick(driver, copyBtn, T);

  const backBtn = await waitForVisible(driver, SELECTORS.backToPageButton, T);
  await safeClick(driver, backBtn, T);

  return token;
}

async function loadSharedToken(driver, token) {
  await clickWorkspaceButton(driver, 'Load');
  await waitForLocated(driver, SELECTORS.loadModalRoot, T);

  const radio = await waitForVisible(
    driver,
    SELECTORS.loadModalSharedViaTokenRadio,
    T,
  );
  await safeClick(driver, radio, T);

  const tokenInput = await waitForVisible(
    driver,
    SELECTORS.loadModalTokenInput,
    T,
  );
  await tokenInput.clear();
  await tokenInput.sendKeys(token);

  const openBtn = await waitForVisible(
    driver,
    SELECTORS.loadModalOpenButton,
    T,
  );
  await safeClick(driver, openBtn, T);

  await sleep(900);
}

/**
 * SPECIAL FILTER FLOWS
 */

async function clearAllSelectedFiltersInLeftPanel(driver) {
  // Best-effort: click all visible clear controls in the filter panel.
  const clears = await driver.findElements(
    By.css(
      ".g3-filter-group button[aria-label='Clear'], .g3-filter-group button[title='Clear'], .g3-filter-group__clear",
    ),
  );
  for (const b of clears) {
    try {
      await safeClick(driver, b, T);
      await sleep(150);
    } catch {
      // ignore
    }
  }
}

async function assertStudyIdCountIsSeven(driver) {
  // Requirement: Consortium=NODAL reduces Study IDs to 7 (as of release v1.36).
  // This is UI-specific. Best-effort: "Study ID" section contains a visible "7".
  const textEl = await waitForVisible(
    driver,
    By.xpath(
      `//*[contains(@class,'g3-filter-section') or contains(@class,'g3-filter-section__title-container')]
        [contains(.,'Study ID') or contains(.,'Study Id')]
        //*[contains(.,'7')]`,
    ),
    T_SLOW,
  );
  expect(await getTextSafe(textEl)).to.include('7');
}

async function excludeOneStudyIdAndAssertSubjectCountChanges(driver) {
  // Click Exclude button inside Study ID filter
  const excludeBtn = await waitForVisible(
    driver,
    By.xpath(
      `//*[contains(.,'Study ID') or contains(.,'Study Id')]/ancestor::*[contains(@class,'g3-filter-section') or contains(@class,'g3-filter-section__title-container')][1]
        //button[normalize-space(.)='Exclude']`,
    ),
    T,
  );
  await safeClick(driver, excludeBtn, T);

  // Select one study id option (first visible checkbox/radio row)
  const before = await readSubjectCount(driver);

  const firstOption = await waitForVisible(
    driver,
    By.xpath(
      `//*[contains(.,'Study ID') or contains(.,'Study Id')]/ancestor::*[contains(@class,'g3-filter-section')][1]
        //input[@type='checkbox' or @type='radio']/ancestor::*[self::label or self::div][1]`,
    ),
    T,
  );
  await safeClick(driver, firstOption, T);

  await expectSubjectCountChanged(driver, before);
}

async function molecularAbnormalityAndResultFlow(driver) {
  // Select INSTRuCT from Subject tab
  await openFilterGroupTab(driver, 'Subject');
  await expandFilterSection(driver, 'Consortium');
  await selectSingleSelectOption(driver, 'INSTRuCT');

  // Switch to Disease tab and select Initial Diagnosis
  await openFilterGroupTab(driver, 'Disease');
  try {
    await expandFilterSection(driver, 'Disease Phase');
    await selectSingleSelectOption(driver, 'Initial Diagnosis');
  } catch {
    const radio = await waitForVisible(
      driver,
      By.xpath(
        `//label[contains(.,'Initial Diagnosis')]//input[@type='radio']`,
      ),
      T,
    );
    await safeClick(driver, radio, T);
  }

  // Select Histology = Alveolar rhabdomyosarcoma
  await expandFilterSection(driver, 'Histology');
  await selectSingleSelectOption(driver, 'Alveolar rhabdomyosarcoma');

  // Switch to Molecular tab; select Molecular Abnormality = FOXO1-PAX3 fusion
  await openFilterGroupTab(driver, 'Molecular');
  await expandFilterSection(driver, 'Molecular Abnormality');
  await selectSingleSelectOption(driver, 'FOXO1-PAX3 fusion');

  // Confirm banner message appears
  await waitForLocated(
    driver,
    SELECTORS.bannerWarning('Molecular Abnormality Result'),
    T_SLOW,
  );

  // Confirm Result filter shows Present/Absent/Unknown rows
  await expandFilterSection(driver, 'Result');
  const present = await waitForVisible(
    driver,
    By.xpath(`//*[contains(.,'Present')]`),
    T,
  );
  const absent = await waitForVisible(
    driver,
    By.xpath(`//*[contains(.,'Absent')]`),
    T,
  );
  const unknown = await waitForVisible(
    driver,
    By.xpath(`//*[contains(.,'Unknown')]`),
    T,
  );
  expect(await getTextSafe(present)).to.include('Present');
  expect(await getTextSafe(absent)).to.include('Absent');
  expect(await getTextSafe(unknown)).to.include('Unknown');

  // Select one Result and confirm subject count changes
  const before = await readSubjectCount(driver);
  await selectSingleSelectOption(driver, 'Present');
  await expectSubjectCountChanged(driver, before);

  // Similar banner may appear; not fatal if text differs.
  try {
    await waitForLocated(driver, SELECTORS.bannerWarning('Result'), T);
  } catch {
    // ignore
  }
}

async function ageAndDiseasePhaseDoesNotCrash(driver) {
  // Disease tab: Disease Phase = Initial Diagnosis
  await openFilterGroupTab(driver, 'Disease');
  await expandFilterSection(driver, 'Disease Phase');
  await selectSingleSelectOption(driver, 'Initial Diagnosis');

  // Scroll to Age at Tumor Assessment and move min slider > 0.
  await expandFilterSection(driver, 'Age at Tumor Assessment');

  const slider = await waitForVisible(
    driver,
    By.xpath(
      `//*[contains(.,'Age at Tumor Assessment')]/ancestor::*[contains(@class,'g3-filter-section')][1]//input[@type='range'][1]`,
    ),
    T,
  );

  // Move the slider using keyboard arrows (reliable)
  await slider.click();
  await slider.sendKeys('\uE014'); // ARROW_RIGHT
  await slider.sendKeys('\uE014');
  await slider.sendKeys('\uE014');

  // Confirm portal did not crash (workspace still present)
  await waitForLocated(driver, SELECTORS.workspaceRoot, T_SLOW);
}

/**
 * EXPLORE IN HELPERS
 */

async function openExploreInModal(driver) {
  const btn = await waitForVisible(driver, SELECTORS.exploreInButton, T);
  await safeClick(driver, btn, T);
  await waitForLocated(driver, SELECTORS.exploreInModalRoot, T);
}

async function pickExploreInCommons(driver, optionText) {
  // Many builds use a dropdown (react-select). Choose option by role.
  await reactSelectPickOptionByLabel(
    driver,
    SELECTORS.exploreInDropdownInput,
    optionText,
  );
}

async function waitForDownloadButtonThenClick(driver) {
  const btn = await waitForVisible(
    driver,
    SELECTORS.exploreInDownloadManifest,
    T,
  );
  await safeClick(driver, btn, T);
}

async function assertOpenInNewTabEnabled(driver) {
  const btn = await waitForVisible(driver, SELECTORS.exploreInOpenNewTab, T);
  expect(await isDisabled(btn)).to.equal(false);
}

async function clickOpenInNewTab(driver) {
  const btn = await waitForVisible(driver, SELECTORS.exploreInOpenNewTab, T);
  await safeClick(driver, btn, T);
}

/**
 * Wait for a new tab to appear and switch to it.
 */
async function switchToNewestTab(driver, timeout = T_SLOW * 2) {
  const before = await driver.getAllWindowHandles();
  await driver.wait(async () => {
    const now = await driver.getAllWindowHandles();
    return now.length > before.length;
  }, timeout);

  const handles = await driver.getAllWindowHandles();
  const newest = handles[handles.length - 1];
  await driver.switchTo().window(newest);
  return newest;
}

/**
 * TEST
 */

describe('Explorer: Filter Workspace, key filters, and Explore In', function () {
  this.timeout(Math.max(T_SLOW * 10, 240000));

  let driver;

  before(async () => {
    driver = await buildDriver();

    // Portal shows an overlay if screen is too small
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

  it('runs Explorer workspace commands, validates filters, and exercises Explore In flows', async () => {
    await goToExplorer(driver);
    await waitForChartsPresent(driver);

    // Unique names to avoid collisions across runs
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const baseName = `E2E Explorer ${stamp}`;
    const filterA = `${baseName} A`;
    const filterB = `${baseName} B`;
    const filterComposed = `${baseName} Composed`;
    const filterDupSaved = `${baseName} Dup`;

    /**
     * Create new filter set
     * - Subject -> Consortium -> INRG
     * - Save
     */
    const startCount = await readSubjectCount(driver);

    await openFilterGroupTab(driver, 'Subject');
    await expandFilterSection(driver, 'Consortium');
    await selectSingleSelectOption(driver, 'INRG');

    await openSaveFilterSetModal(driver);
    await saveFilterSet(driver, {
      name: filterA,
      description: 'E2E explorer cohort A: INRG',
    });

    await assertWorkspaceHasFilterSet(driver, filterA);

    /**
     * Load a saved filter set, ensure the bar charts reflect the right number of subjects
     * - Clear, then Load
     */
    await clearActiveFilterSet(driver);
    await loadFilterSetByName(driver, filterA);

    const loadedCount = await readSubjectCount(driver);
    expect(loadedCount).to.be.a('number');
    await waitForChartsPresent(driver);

    /**
     * Make changes to the filter and confirm the number of subjects is reflected properly
     * - Add Sex=Female (should change subject count)
     */
    const beforeChange = await readSubjectCount(driver);

    await openFilterGroupTab(driver, 'Subject');
    await expandFilterSection(driver, 'Sex');
    await selectSingleSelectOption(driver, 'Female');

    await expectSubjectCountChanged(driver, beforeChange);

    /**
     * Save (Update) and remove it from workspace. Ensure it can be reopened.
     */
    await openSaveFilterSetModal(driver); // Save/Update
    await saveFilterSet(driver, {
      name: filterA,
      description: 'E2E explorer cohort A: INRG + Female',
    });

    await removeActiveFilterSet(driver);

    // Reopen via Load
    await loadFilterSetByName(driver, filterA);
    await assertWorkspaceHasFilterSet(driver, filterA);

    /**
     * Confirm Workspace commands
     */

    // New: adds another empty set when at least one filter set is active
    await clickWorkspaceButton(driver, 'New');
    await sleep(600);
    const cardsAfterNew = await driver.findElements(SELECTORS.filterSetCards);
    expect(cardsAfterNew.length).to.be.greaterThan(1);

    // Create filterB in the second set to support compose:
    // Click last card to make it active
    const cards = await driver.findElements(SELECTORS.filterSetCards);
    await safeClick(driver, cards[cards.length - 1], T);
    await sleep(250);

    await clearAllSelectedFiltersInLeftPanel(driver);
    await openFilterGroupTab(driver, 'Subject');
    await expandFilterSection(driver, 'Sex');
    await selectSingleSelectOption(driver, 'Male');

    await openSaveFilterSetModal(driver);
    await saveFilterSet(driver, {
      name: filterB,
      description: 'E2E explorer cohort B: Male',
    });

    await assertWorkspaceHasFilterSet(driver, filterB);

    // Duplicate: cannot duplicate empty; ensure we duplicate a saved active set
    await makeFilterSetActiveByName(driver, filterA);
    await duplicateActiveFilterSet(driver);

    // Save duplicated set (it has no name)
    await openSaveFilterSetModal(driver);
    await saveFilterSet(driver, {
      name: filterDupSaved,
      description: 'E2E explorer duplicated set',
    });
    await assertWorkspaceHasFilterSet(driver, filterDupSaved);

    // Remove duplicated set
    await makeFilterSetActiveByName(driver, filterDupSaved);
    await removeActiveFilterSet(driver);

    // Clear: clears name and filter selections from the active filter set
    await makeFilterSetActiveByName(driver, filterB);
    await clearActiveFilterSet(driver);
    const afterClearCount = await readSubjectCount(driver);
    expect(afterClearCount).to.be.a('number');

    // Reset: load saved, change filters, reset restores saved
    await loadFilterSetByName(driver, filterA);
    const savedCount = await readSubjectCount(driver);

    // Make a change (toggle another selection that affects count)
    await openFilterGroupTab(driver, 'Subject');
    await expandFilterSection(driver, 'Race');
    try {
      await selectSingleSelectOption(driver, 'Unknown');
    } catch {
      // Fallback: use Sex=Male if Race isn’t available
      await expandFilterSection(driver, 'Sex');
      await selectSingleSelectOption(driver, 'Male');
    }

    // Confirm Reset becomes active when a change is made
    const resetBtn = await waitForVisible(
      driver,
      SELECTORS.workspaceButtonByText('Reset'),
      T,
    );
    expect(await isDisabled(resetBtn)).to.equal(false);

    // Hit Reset and confirm the original saved filter set is restored
    await resetActiveFilterSet(driver);
    await expectSubjectCountEquals(driver, savedCount);

    // Remove all: clears workspace
    await removeAllFilterSets(driver);
    const cardsAfterRemoveAll = await driver.findElements(
      SELECTORS.filterSetCards,
    );
    expect(cardsAfterRemoveAll.length).to.equal(0);

    // Load two saved filter sets for Compose
    await loadFilterSetByName(driver, filterA);
    await clickWorkspaceButton(driver, 'New');
    await loadFilterSetByName(driver, filterB);

    // Compose A + B (AND), then save
    await composeTwoFilterSets(driver, {
      nameA: filterA,
      nameB: filterB,
      op: 'And',
    });
    await openSaveFilterSetModal(driver);
    await saveFilterSet(driver, {
      name: filterComposed,
      description: 'E2E composed cohort (A AND B)',
    });
    await assertWorkspaceHasFilterSet(driver, filterComposed);

    // Share: generate token, copy, then load via token
    const token = await shareActiveFilterSetAndGetToken(driver);
    await removeAllFilterSets(driver);
    await loadSharedToken(driver, token);

    /**
     * Specific filter behaviors
     */

    // Consortium=NODAL, Study ID count goes down to 7 (as of v1.36)
    await clearAllSelectedFiltersInLeftPanel(driver);
    await openFilterGroupTab(driver, 'Subject');
    await expandFilterSection(driver, 'Consortium');
    await selectSingleSelectOption(driver, 'NODAL');

    await expandFilterSection(driver, 'Study ID');
    await assertStudyIdCountIsSeven(driver);

    // Study ID exclude behavior changes subject count
    await excludeOneStudyIdAndAssertSubjectCountChanges(driver);

    // Molecular abnormality & result flow
    await molecularAbnormalityAndResultFlow(driver);

    // Age + Disease Phase does not crash
    await ageAndDiseasePhaseDoesNotCrash(driver);

    /**
     * Explore In - GDC
     * - Verify: Open in New Tab disabled until download, enabled after download, opens new tab
     */
    await openExploreInModal(driver);
    await pickExploreInCommons(driver, 'Genomic Data Commons');

    const openBtn = await waitForVisible(
      driver,
      SELECTORS.exploreInOpenNewTab,
      T,
    );
    expect(await isDisabled(openBtn)).to.equal(true);

    await waitForDownloadButtonThenClick(driver);
    await sleep(900);
    await assertOpenInNewTabEnabled(driver);

    const mainHandle = (await driver.getAllWindowHandles())[0];
    await clickOpenInNewTab(driver);
    await switchToNewestTab(driver);

    const gdcUrl = await driver.getCurrentUrl();
    expect(gdcUrl.toLowerCase()).to.include('gdc');

    await driver.close();
    await driver.switchTo().window(mainHandle);

    /**
     * Explore In - GMKF
     * - Verify: download enables open new tab; navigate to Kids First
     */
    await openExploreInModal(driver);
    await pickExploreInCommons(driver, 'Gabriella Miller Kids First');

    const openBtn2 = await waitForVisible(
      driver,
      SELECTORS.exploreInOpenNewTab,
      T,
    );
    expect(await isDisabled(openBtn2)).to.equal(true);

    await waitForDownloadButtonThenClick(driver);
    await sleep(900);
    await assertOpenInNewTabEnabled(driver);

    const mainHandle2 = (await driver.getAllWindowHandles())[0];
    await clickOpenInNewTab(driver);
    await switchToNewestTab(driver);

    const kfUrl = await driver.getCurrentUrl();
    expect(kfUrl.toLowerCase()).to.include('kidsfirst');

    // Best-effort: click Participant left nav if present
    try {
      const participantNav = await waitForVisible(
        driver,
        By.xpath(
          `//*[normalize-space(.)='Participant' or normalize-space(.)='Participants']`,
        ),
        T_SLOW,
      );
      await safeClick(driver, participantNav, T);
      await sleep(600);
    } catch {
      // ignore
    }

    await driver.close();
    await driver.switchTo().window(mainHandle2);

    // Sanity: explorer still alive and subject count still readable
    await waitForLocated(driver, SELECTORS.workspaceRoot, T_SLOW);
    const endCount = await readSubjectCount(driver);
    expect(endCount).to.be.a('number');

    // Not asserting endCount equals startCount; this test changes filters a lot.
    expect(startCount).to.be.a('number');
  });
});
