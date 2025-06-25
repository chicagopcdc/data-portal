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
 * @param {{ path: string; body: string }} payload
 * @returns {Promise<ExternalCommonsInfo>}
 */
async function fetchExternalCommonsInfo(payload) {
  const res = await fetchWithCreds({ ...payload, method: 'POST' });
  if (res.status !== 200) throw res.response.statusText;
  return res.data;
}

function saveToFile(savingStr, filename) {
  const blob = new Blob([savingStr], { type: 'text/plain' });
  FileSaver.saveAs(blob, filename);
}

/**
 * @param {Object} props
 * @param {ExplorerFilter} props.filter
 */
function ExplorerExploreExternalButton({ filter }) {
  const emptyOption = {
    label: 'Select data commons',
    value: '',
  };

  const [selected, setSelected] = useState(emptyOption);
  const [show, setShow] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDisabled, setIsDisabled] = useState(false);
  const [commonsInfo, setCommonsInfo] = useState(
    /** @type {ExternalCommonsInfo} */(null)
  );
  const [externalConfig, setExternalConfig] = useState(
    /** @type {ExternalConfig} */(null)
  );
  const [isFileDownloaded, setIsFileDownloaded] = useState(false);

  // Run on page load
  // Determine if the top-level "Explore in..." button should be disabled
  useEffect(() => {
    handleFetchExternalConfig();
    checkDataForExplore();
  }, [externalConfig]);

  function openPopup() {
    setShow(true);
  }

  function closePopup() {
    setSelected(emptyOption);
    setCommonsInfo(null);
    setExternalConfig(null);
    setShow(false);
    setIsLoading(false);
    setIsFileDownloaded(false);
  }

  // Determine if the top-level "Explore in..." button should be disabled
  function checkDataForExplore() {
    if (externalConfig?.commons?.length > 0) {
      setIsDisabled(false); // Enable otherwise
    } else {
      setIsDisabled(true); // Disable if commonsInfo is not available
    }
  }

  function handleFetchExternalConfig() {
    setIsLoading(true);
    fetchWithCreds({ path: '/analysis/tools/external/config' })
      .then(({ data }) => {
        setExternalConfig(data);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }

  /** @param {typeof selected} newSelected */
  async function handleSelectExternalCommons(newSelected) {
    if (selected.value === newSelected.value) return;
    setCommonsInfo(null);
    setSelected(newSelected);

    if (newSelected.value === '') {
      return;
    }

    try {
      setIsLoading(true);
      const newCommonsInfo = await fetchExternalCommonsInfo({
        path: `/analysis/tools/external/${newSelected.value}`,
        body: JSON.stringify({ filter: getGQLFilter(filter) ?? {} }),
      });
      setCommonsInfo(newCommonsInfo);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }

  function handleOpenExternalCommons() {
    window.open(commonsInfo.link, '_blank');
    closePopup();
  }

  function handleDownloadManifest() {
    const dateString = new Date().toISOString().split('T')[0];
    const filename = `${dateString}-manifest-${selected.value}.txt`;
    saveToFile(commonsInfo.data, filename);
    setIsFileDownloaded(true);
  }

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
                    options={[emptyOption, ...(externalConfig?.commons || [])]}
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
};

export default ExplorerExploreExternalButton;