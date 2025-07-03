import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import Select from 'react-select';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import FileSaver from 'file-saver';
import SimplePopup from '../../components/SimplePopup';
import SimpleInputField from '../../components/SimpleInputField';
import Button from '../../gen3-ui-component/components/Button';
import { overrideSelectTheme } from '../../utils';
import { fetchWithCreds } from '../../utils.fetch';
import { getGQLFilter } from '../../GuppyComponents/Utils/queries';
import ExplorerFilterDisplay from '../ExplorerFilterDisplay';
import './ExplorerExploreExternalButton.css';
import Spinner from '../../components/Spinner';

/** @typedef {import('../types').ExplorerFilter} ExplorerFilter */
/** @typedef {import('./types').ExternalCommonsInfo} ExternalCommonsInfo */
/** @typedef {import('./types').ExternalConfig} ExternalConfig */

/**
 * Helper to save manifest content as a file
 * @param {string} savingStr
 * @param {string} filename
 */
function saveToFile(savingStr, filename) {
  const blob = new Blob([savingStr], { type: 'text/plain' });
  FileSaver.saveAs(blob, filename);
}

/**
 * Fetch commons information (e.g., manifest or redirect link)
 * @param {{ path: string; body: string }} payload
 * @returns {Promise<ExternalCommonsInfo>}
 */
async function fetchExternalCommonsInfo(payload) {
  const res = await fetchWithCreds({ ...payload, method: 'POST' });
  if (res.status !== 200) throw res.response.statusText;
  return res.data;
}

/**
 * Main component for Explore External Button
 * @param {Object} props
 * @param {ExplorerFilter} props.filter - Current filter object for queries
 * @param {Array<{ resourceName: string, count: number }>} props.selectedCommonsCounts - Array of commons with their subject counts
 * @param {ExternalConfig} props.externalConfig - External configuration object from commons config
 * @param {boolean} props.isLoading - Loading state controlled by parent
 * @param {function} props.setIsLoading - Function to update loading state from parent
 */
function ExplorerExploreExternalButton({ filter, selectedCommonsCounts, externalConfig, isLoading, setIsLoading }) {
  const emptyOption = {
    label: 'Select data commons',
    value: '',
  };

  // State for popup UI
  const [selected, setSelected] = useState(emptyOption);
  const [show, setShow] = useState(false);
  const [isDisabled, setIsDisabled] = useState(false);
  const [isFileDownloaded, setIsFileDownloaded] = useState(false);

  // State for external commons config and result data
  const [commonsInfo, setCommonsInfo] = useState(/** @type {ExternalCommonsInfo} */(null));

  // Available commons to check
  const resourceCounts = Object.fromEntries(
    selectedCommonsCounts.map((entry) => [entry.resourceName, entry.count])
  );

  // Filter commons options based on presence of corresponding subjects
  const validCommonsOptions = externalConfig?.commons?.filter((entry) => {
    if (!externalConfig.commons_dict?.hasOwnProperty(entry.value)) {
      return false;
    }

    // Check if we have a count entry for this resource
    const resourceName = externalConfig.commons_dict[entry.value];
    const count = resourceCounts[resourceName];

    return count > 0;
  }) || [];

  // Enable/disable Explore button based on valid options
  useEffect(() => {
    setIsDisabled(validCommonsOptions.length === 0);
  }, [validCommonsOptions]);

  // Handle opening the popup
  function openPopup() {
    setShow(true);
  }

  // Handle closing popup and resetting state
  function closePopup() {
    setSelected(emptyOption);
    setCommonsInfo(null);
    setShow(false);
    setIsLoading(false);
    setIsFileDownloaded(false);
  }

  /**
   * Handle dropdown option selection
   * @param {typeof selected} newSelected
   */
  async function handleSelectExternalCommons(newSelected) {
    if (selected.value === newSelected.value) return;
    setCommonsInfo(null);
    setSelected(newSelected);

    if (newSelected.value === '') return;

    try {
      setIsLoading(true);
      const newCommonsInfo = await fetchExternalCommonsInfo({
        path: `/analysis/tools/external/${newSelected.value}`,
        body: JSON.stringify({ filter: getGQLFilter(filter) ?? {} }),
      });
      setCommonsInfo(newCommonsInfo);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }

  // Open commons link in new tab
  function handleOpenExternalCommons() {
    window.open(commonsInfo.link, '_blank');
    closePopup();
  }

  // Download manifest file
  function handleDownloadManifest() {
    const dateString = new Date().toISOString().split('T')[0];
    const filename = `${dateString}-manifest-${selected.value}.txt`;
    saveToFile(commonsInfo.data, filename);
    setIsFileDownloaded(true);
  }

  // Check if "Open in new tab" button should be enabled
  function isOpenInNewTabButtonEnabled() {
    if (!commonsInfo) return false;
    if (commonsInfo.type === 'file') return commonsInfo.data ? isFileDownloaded : false;
    if (commonsInfo.type === 'redirect') return !!commonsInfo.link;
    return true;
  }

  return (
    <>
      <Button
        label={<div>Explore in...</div>}
        rightIcon='external-link'
        buttonType='secondary'
        onClick={openPopup}
        enabled={!isDisabled}
      />
      {show && (
        <SimplePopup>
          <div className='explorer-explore-external__form'>
            <h4>Explore in An External Data Commons</h4>
            <form onSubmit={(e) => e.preventDefault()}>
              <SimpleInputField
                label='Data Commons'
                input={
                  <Select
                    inputId='explore-external-data-commons'
                    options={[emptyOption, ...validCommonsOptions]}
                    value={selected}
                    autoFocus
                    isClearable={false}
                    theme={overrideSelectTheme}
                    onChange={handleSelectExternalCommons}
                  />
                }
              />
              <ExplorerFilterDisplay filter={filter} />
              {((commonsInfo?.type === 'file' && !commonsInfo.data)
                || (commonsInfo?.type === 'redirect' && !commonsInfo.link)) && (
                  <p className='no-data-info'>
                    There is no data for this cohort of subjects in the{' '}
                    {selected.value.toUpperCase()} platform
                  </p>
                )}
              {isLoading && (
                <div className='explorer-explore-external__loading'>
                  <Spinner />
                </div>
              )}
            </form>
            {commonsInfo?.type === 'file' && commonsInfo?.data && (
              <div className='explorer-explore-external__download-manifest'>
                <p>
                  <FontAwesomeIcon
                    icon='triangle-exclamation'
                    color='var(--pcdc-color__secondary)'
                  />
                  Download a manifest file and upload it to the selected commons
                  to use the current cohort.
                </p>
                <Button
                  label='Download manifest'
                  onClick={handleDownloadManifest}
                />
              </div>
            )}
            <div>
              <Button
                className='explorer-explore-external__button'
                buttonType='default'
                label='Back to page'
                onClick={closePopup}
              />
              <Button
                label='Open in new tab'
                enabled={isOpenInNewTabButtonEnabled()}
                onClick={handleOpenExternalCommons}
              />
            </div>
          </div>
        </SimplePopup>
      )}
    </>
  );
}

ExplorerExploreExternalButton.propTypes = {
  filter: PropTypes.object.isRequired,
  selectedCommonsCounts: PropTypes.arrayOf(
    PropTypes.shape({
      resourceName: PropTypes.string.isRequired,
      count: PropTypes.number.isRequired,
    })
  ).isRequired,
  externalConfig: PropTypes.object,
  isLoading: PropTypes.bool.isRequired,
  setIsLoading: PropTypes.func.isRequired,
};

export default ExplorerExploreExternalButton;
