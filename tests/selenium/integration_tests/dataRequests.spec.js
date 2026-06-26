const { expect } = require('chai');
const { By, until, Key } = require('selenium-webdriver');
const { buildDriver } = require('../driver');
const config = require('../config');

/**
 * Data Requests test
 *
 * Purpose:
 * - Test Admin functionality for Data Requests (note: requires Admin login)
 * - Create a saved Filter Set (cohort) so it can be added to a Data Request
 * - Create a Data Request (Create Request)
 * - Toggle View All (Admin) from the page ellipses menu
 * - Use row ellipses to open Edit popup and:
 *   - Update State -> Agreements Executed
 *   - User Access -> Add Users to Project (multi-email widget) -> Submit
 *
 */

const T = config.timeoutMs || 30000;

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

async function clearAndType(inputEl, value) {
  await inputEl.click();
  await inputEl.sendKeys(Key.chord(Key.COMMAND, 'a'), Key.BACK_SPACE);
  await inputEl.sendKeys(value);
}

/**
 * Navigation helpers
 */

async function openDataRequestsFromProfileMenu(driver) {
  // Profile icon button
  await safeClick(driver, By.css('button[title="Profile"]'), T);

  // Menu item/link: "Data Requests"
  await safeClick(
    driver,
    By.xpath(
      `//a[normalize-space()="Data Requests"] | //button[normalize-space()="Data Requests"] | //*[@role="menuitem" and normalize-space()="Data Requests"]`,
    ),
    T,
  );

  // Data Requests page root
  await waitForVisible(driver, By.css('.data-requests'), T);
}

/**
 * Filter Set creation helpers (for "Add Filter" inside Create Data Request)
 */

async function goToExplorer(driver, baseUrl) {
  await driver.get(`${baseUrl}/explorer`);
  await waitForLocated(driver, By.css('main'), T);
}

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
  // Clear current filter workspace selections (prevents filters from carrying over)
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

async function createSavedFilterSetForDataRequest(
  driver,
  baseUrl,
  overrideName = '',
) {
  // If user provided a name override, don’t recreate (assume it exists)
  if (overrideName) return overrideName;

  // Create unique Filter Set name (avoid duplicate issues across test runs)
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filterSetName = `E2E Data Request ${stamp}`;

  await goToExplorer(driver, baseUrl);

  // Simple, stable cohort: Subject -> Sex -> Female
  await openFilterGroupTab(driver, 'Subject');
  await expandFilterSection(driver, 'Sex');
  await selectSingleSelectOption(driver, 'Female');

  await openSaveFilterSetModal(driver);
  await saveFilterSet(driver, {
    name: filterSetName,
    description: 'E2E data request cohort: Female',
  });

  await clearWorkspace(driver);
  return filterSetName;
}

/**
 * Create Request helpers
 */

async function openCreateRequestForm(driver) {
  await safeClick(
    driver,
    By.xpath(`//button[normalize-space()="Create Request"]`),
    T,
  );
  await waitForVisible(
    driver,
    By.xpath(`//h2[normalize-space()="Create Data Request"]`),
    T,
  );
}

async function fillCreateRequestFormBasics(
  driver,
  { userId, projectName, institution, description },
) {
  // User Id
  const userIdInput = await waitForVisible(
    driver,
    By.css('input[name="user_id"]'),
    T,
  );
  await clearAndType(userIdInput, userId);

  // Project Name
  const nameInput = await waitForVisible(
    driver,
    By.css('input[name="name"]'),
    T,
  );
  await clearAndType(nameInput, projectName);

  // Institution
  const instInput = await waitForVisible(
    driver,
    By.css('input[name="institution"]'),
    T,
  );
  await clearAndType(instInput, institution);

  // Description
  const desc = await waitForVisible(
    driver,
    By.css('textarea[name="description"]'),
    T,
  );
  await desc.click();
  await desc.sendKeys(description);
}

async function addEmailsViaMultiValueWidget(
  driver,
  { inputCss, addButtonXpath, emails },
) {
  const input = await waitForVisible(driver, By.css(inputCss), T);
  const addBtn = await waitForVisible(driver, By.xpath(addButtonXpath), T);

  for (const email of emails) {
    await clearAndType(input, email);
    await safeClick(driver, addBtn, T);

    // Confirm pill appears
    await waitForVisible(
      driver,
      By.xpath(`//*[contains(@class,"pill") and normalize-space()="${email}"]`),
      T,
    );
  }
}

async function addDataRecipients(driver, emails) {
  await addEmailsViaMultiValueWidget(driver, {
    inputCss: '#associated_users_emails-input',
    addButtonXpath: `//button[@type="button" and normalize-space()="Add Email"]`,
    emails,
  });
}

async function addFilterSetToDataRequest(driver, filterSetName) {
  // Click "Add Filter" on request form
  await safeClick(
    driver,
    By.xpath(`//button[normalize-space()="Add Filter"]`),
    T,
  );

  // Wait for overlay containing the explorer filter set open form
  await waitForVisible(
    driver,
    By.css('.simple-popup__overlay .explorer-filter-set-form'),
    T,
  );

  // React-select combobox input (stable id)
  const combo = await waitForVisible(
    driver,
    By.css('#open-filter-set-name'),
    T,
  );
  await safeClick(driver, combo, T);
  await combo.sendKeys(filterSetName);

  // Pick option
  const opt = await waitForVisible(
    driver,
    By.xpath(`//*[@role="option" and normalize-space()="${filterSetName}"]`),
    T,
  );
  await safeClick(driver, opt, T);

  // Open Filter Set button becomes enabled after selection
  const openBtn = await waitForVisible(
    driver,
    By.xpath(`//button[normalize-space()="Open Filter Set"]`),
    T,
  );
  await driver.wait(until.elementIsEnabled(openBtn), T);
  await safeClick(driver, openBtn, T);

  // Wait for modal to close
  await driver.wait(until.stalenessOf(openBtn), T);

  // Confirm filter listbox exists on the request form
  await waitForLocated(driver, By.css('#filter_set_ids-listbox'), T);
}

async function submitCreateRequest(driver) {
  await safeClick(
    driver,
    By.xpath(`//button[@type="submit" and normalize-space()="Create"]`),
    T,
  );
  await waitForVisible(driver, By.css('.data-requests'), T);
}

/**
 * Admin actions (View All + row edit popup)
 */

async function enableViewAllAdmin(driver) {
  // Page-level ellipses
  const pageKebab = await waitForVisible(
    driver,
    By.css(
      'button.data-request__table-view-options-trigger[aria-label="Table view options"]',
    ),
    T,
  );
  await safeClick(driver, pageKebab, T);

  // Toggle in popup
  const toggle = await waitForVisible(
    driver,
    By.css('#data-request-admin-toggle'),
    T,
  );

  // Click label for reliability
  const isChecked = await toggle.isSelected().catch(() => false);
  if (!isChecked) {
    await safeClick(
      driver,
      By.css('label[for="data-request-admin-toggle"]'),
      T,
    );
  }

  await driver.wait(async () => {
    try {
      return await toggle.isSelected();
    } catch {
      const checked = await toggle.getAttribute('checked');
      return !!checked;
    }
  }, T);
}

async function openRowEditPopup(driver, projectName) {
  // Find row by request/project name, then click row ellipses
  const row = await waitForVisible(
    driver,
    By.xpath(
      `//*[normalize-space()="${projectName}"]/ancestor::tr[contains(@class,"base-table__row")][1]` +
        ` | //*[normalize-space()="${projectName}"]/ancestor::div[contains(@class,"base-table__row")][1]`,
    ),
    T,
  );

  const rowKebab = await row.findElement(
    By.css(
      'button.data-request__table-row-options-trigger[aria-label="Table view options"]',
    ),
  );
  await safeClick(driver, rowKebab, T);

  // Edit popup title should appear
  await waitForVisible(driver, By.css('.popup__box .popup__title-text'), T);
}

async function updateStateToAgreementsExecuted(driver) {
  // Open state form
  await safeClick(
    driver,
    By.xpath(
      `//div[contains(@class,"popup__box")]//button[normalize-space()="Update State"]`,
    ),
    T,
  );

  await waitForVisible(
    driver,
    By.xpath(
      `//div[contains(@class,"popup__box")]//h2[normalize-space()="Change Project State"]`,
    ),
    T,
  );

  // React-select combobox input in state form
  const combo = await waitForVisible(
    driver,
    By.css('#react-select-3-input'),
    T,
  );
  await safeClick(driver, combo, T);

  // Choose option
  const opt = await waitForVisible(
    driver,
    By.xpath(`//*[@role="option" and normalize-space()="Agreements Executed"]`),
    T,
  );
  await safeClick(driver, opt, T);

  // Submit
  const submit = await waitForVisible(
    driver,
    By.xpath(
      `//div[contains(@class,"popup__box")]//button[@type="submit" and normalize-space()="Submit"]`,
    ),
    T,
  );
  await driver.wait(until.elementIsEnabled(submit), T);
  await safeClick(driver, submit, T);

  // Popup remains; actions list usually returns
  await waitForVisible(driver, By.css('.popup__box'), T);
}

async function addUsersToProjectAndSubmit(driver, emails) {
  // Open Add Users form (button label in your popup list is "User Access")
  await safeClick(
    driver,
    By.xpath(
      `//div[contains(@class,"popup__box")]//button[normalize-space()="User Access"]`,
    ),
    T,
  );

  await waitForVisible(
    driver,
    By.xpath(
      `//div[contains(@class,"popup__box")]//h2[normalize-space()="Add Users to Project"]`,
    ),
    T,
  );

  // Same multi-email widget as Create Request
  await addEmailsViaMultiValueWidget(driver, {
    inputCss: '#associated_users_emails-input',
    addButtonXpath: `//button[@type="button" and normalize-space()="Add Email"]`,
    emails,
  });

  const submitBtn = await waitForVisible(
    driver,
    By.xpath(`//button[@type="submit" and normalize-space()="Submit"]`),
    T,
  );
  await driver.wait(until.elementIsEnabled(submitBtn), T);
  await safeClick(driver, submitBtn, T);

  // Wait for the Add Users form header to disappear (back to action list)
  await driver.wait(async () => {
    const headers = await driver.findElements(
      By.xpath(
        `//div[contains(@class,"popup__box")]//h2[normalize-space()="Add Users to Project"]`,
      ),
    );
    return headers.length === 0;
  }, T);
}

describe('Data Requests (Admin)', function () {
  this.timeout(120000);

  let driver;

  // -------------------------
  // Test Data (override via env)
  // -------------------------
  const BASE_URL = process.env.BASE_URL || config.baseUrl;

  const ADMIN_USER_ID = process.env.DATA_REQUEST_USER_ID || '34';

  const END_USER_EMAIL = process.env.END_USER_EMAIL || 'end.user@example.com'; // must be Google-authenticatable in real env
  const EXTRA_USER_EMAIL =
    process.env.EXTRA_USER_EMAIL || 'non.registered.user@example.com';

  const PROJECT_NAME =
    process.env.DATA_REQUEST_PROJECT_NAME ||
    `selenium-data-request-${new Date().toISOString().replace(/[:.]/g, '-')}`;

  const INSTITUTION =
    process.env.DATA_REQUEST_INSTITUTION || 'University of Chicago';

  const DESCRIPTION =
    process.env.DATA_REQUEST_DESCRIPTION ||
    'Selenium E2E: automated data request creation test';

  const FILTER_SET_NAME_OVERRIDE =
    process.env.DATA_REQUEST_FILTER_SET_NAME || '';

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

    await driver.get(BASE_URL);
  });

  after(async () => {
    if (driver) await driver.quit();
  });

  /**
   * Run Test
   */
  it('creates a filter set, creates a request, updates state, and adds users', async () => {
    // Step 0: Create (or use) a saved Filter Set so the Data Request can add it
    const filterSetName = await createSavedFilterSetForDataRequest(
      driver,
      BASE_URL,
      FILTER_SET_NAME_OVERRIDE,
    );

    // Step 1: Navigate to Data Requests
    await openDataRequestsFromProfileMenu(driver);

    // Step 2: Create Request
    await openCreateRequestForm(driver);
    await fillCreateRequestFormBasics(driver, {
      userId: ADMIN_USER_ID,
      projectName: PROJECT_NAME,
      institution: INSTITUTION,
      description: DESCRIPTION,
    });

    // Data Recipients (must include end-user email not used to create request)
    await addDataRecipients(driver, [END_USER_EMAIL]);

    // Add the saved filter set (react-select modal)
    await addFilterSetToDataRequest(driver, filterSetName);

    // Create request
    await submitCreateRequest(driver);

    // Confirm request appears on list page
    const pageText = await driver.findElement(By.css('body')).getText();
    expect(pageText).to.include(PROJECT_NAME);

    // Step 3: Admin-only controls
    await enableViewAllAdmin(driver);

    // Step 4: Row actions -> Update State -> Agreements Executed
    await openRowEditPopup(driver, PROJECT_NAME);
    await updateStateToAgreementsExecuted(driver);

    // Step 5: Row actions -> User Access -> Add Users to Project
    // (Re-open popup if UI returned to list / action list)
    await openRowEditPopup(driver, PROJECT_NAME);
    await addUsersToProjectAndSubmit(driver, [EXTRA_USER_EMAIL]);

    // Sanity: still on Data Requests page
    await waitForLocated(driver, By.css('.data-requests'), T);
  });
});
