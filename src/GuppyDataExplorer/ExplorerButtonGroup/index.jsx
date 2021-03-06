import React from 'react';
import FileSaver from 'file-saver';
import Button from '../../gen3-ui-component/components/Button';
import Dropdown from '../../gen3-ui-component/components/Dropdown';
import Toaster from '../../gen3-ui-component/components/Toaster';
import { getGQLFilter } from '@pcdc/guppy/dist/components/Utils/queries';
import PropTypes from 'prop-types';
import { calculateDropdownButtonConfigs, humanizeNumber } from '../utils';
import { ButtonConfigType, GuppyConfigType } from '../configTypeDef';
import { fetchWithCreds } from '../../actions';
import {
  manifestServiceApiPath,
  guppyGraphQLUrl,
  terraExportWarning,
} from '../../localconf';
import './ExplorerButtonGroup.css';
import Popup from '../../components/Popup';

class ExplorerButtonGroup extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      // for manifest
      manifestEntryCount: 0,

      // for exports
      toasterOpen: false,
      toasterHeadline: '',
      toasterError: null,
      toasterErrorText: 'There was an error exporting your cohort.',
      exportingToTerra: false,
      exportingToSevenBridges: false,
      // for export to PFB
      exportPFBStatus: null,
      exportPFBURL: '',
      pfbStartText: 'Your export is in progress.',
      pfbWarning:
        'Please do not navigate away from this page until your export is finished.',
      pfbSuccessText:
        'Your cohort has been exported to PFB! The URL is displayed below.',
      // for export to workspace
      exportingToWorkspace: false,
      exportWorkspaceFileName: null,
      exportWorkspaceStatus: null,
      workspaceSuccessText:
        'Your cohort has been saved! In order to view and run analysis on this cohort, please go to the workspace.',
    };
  }

  componentDidUpdate(prevProps) {
    if (
      this.props.job &&
      this.props.job.status === 'Completed' &&
      prevProps.job.status !== 'Completed'
    ) {
      this.fetchJobResult().then((res) => {
        if (this.state.exportingToTerra) {
          this.setState(
            {
              exportPFBURL: `${res.data.output}`.split('\n'),
              toasterOpen: false,
              exportingToTerra: false,
            },
            () => {
              this.sendPFBToTerra();
            }
          );
        } else if (this.state.exportingToSevenBridges) {
          this.setState(
            {
              exportPFBURL: `${res.data.output}`.split('\n'),
              toasterOpen: false,
              exportingToSevenBridges: false,
            },
            () => {
              this.sendPFBToSevenBridges();
            }
          );
        } else {
          this.setState({
            exportPFBURL: `${res.data.output}`.split('\n'),
            toasterOpen: true,
            toasterHeadline: this.state.pfbSuccessText,
          });
        }
      });
    }
    if (
      this.props.totalCount !== prevProps.totalCount &&
      this.props.totalCount
    ) {
      this.refreshManifestEntryCount();
    }
  }

  componentWillUnmount() {
    this.props.resetJobState();
  }

  getOnClickFunction = (buttonConfig) => {
    let clickFunc = () => {};
    if (buttonConfig.type === 'data') {
      clickFunc = this.downloadData(buttonConfig.fileName);
    }
    if (buttonConfig.type === 'manifest') {
      clickFunc = this.downloadManifest(buttonConfig.fileName, null);
    }
    if (buttonConfig.type === 'file-manifest') {
      clickFunc = this.downloadManifest(buttonConfig.fileName, 'file');
    }
    if (buttonConfig.type === 'export') {
      // REMOVE THIS CODE WHEN TERRA EXPORT WORKS
      // =======================================
      if (terraExportWarning) {
        clickFunc = this.exportToTerraWithWarning;
      } else {
        // =======================================
        clickFunc = this.exportToTerra;
      }
    }
    if (buttonConfig.type === 'export-to-seven-bridges') {
      clickFunc = this.exportToSevenBridges;
    }
    if (buttonConfig.type === 'export-to-pfb') {
      clickFunc = this.exportToPFB;
    }
    if (buttonConfig.type === 'export-to-workspace') {
      clickFunc = this.exportToWorkspace;
    }
    if (buttonConfig.type === 'export-files-to-workspace') {
      clickFunc = () => this.exportToWorkspace('file');
    }
    return clickFunc;
  };

  getManifest = async (indexType) => {
    if (
      !this.props.guppyConfig.manifestMapping ||
      !this.props.guppyConfig.manifestMapping.referenceIdFieldInDataIndex
    ) {
      return Promise.reject(
        'No "guppyConfig.manifestMapping" or "guppyConfig.manifestMapping.referenceIdFieldInDataIndex" defined in config'
      );
    }
    const refField = this.props.guppyConfig.manifestMapping
      .referenceIdFieldInDataIndex;
    const md5Field = 'md5sum';
    const fileNameField = 'file_name';
    const fileSizeField = 'file_size';
    const additionalFields = [md5Field, fileNameField, fileSizeField];
    if (indexType === 'file') {
      let rawData;
      try {
        // the additionalFields are hardcoded, so it's possible they may
        // not be available in Guppy's index. Try to download the additional fields
        // first, and if the download fails, download only the referenceIDField.
        rawData = await this.props.downloadRawDataByFields({
          fields: [refField, ...additionalFields],
        });
      } catch (err) {
        rawData = await this.props.downloadRawDataByFields({
          fields: [refField],
        });
      }
      return rawData;
    }
    const refIDList = await this.props
      .downloadRawDataByFields({ fields: [refField] })
      .then((res) => res.map((i) => i[refField]));
    const refFieldInResourceIndex = this.props.guppyConfig.manifestMapping
      .referenceIdFieldInResourceIndex;
    const resourceFieldInResourceIndex = this.props.guppyConfig.manifestMapping
      .resourceIdField;
    const resourceType = this.props.guppyConfig.manifestMapping
      .resourceIndexType;
    const filter = {
      [refFieldInResourceIndex]: {
        selectedValues: refIDList,
      },
    };
    if (this.props.filter.data_format) {
      filter.data_format = this.props.filter.data_format;
    }
    let resultManifest;
    try {
      resultManifest = await this.props.downloadRawDataByTypeAndFilter(
        resourceType,
        filter,
        [
          refFieldInResourceIndex,
          resourceFieldInResourceIndex,
          ...additionalFields,
        ]
      );
    } catch (err) {
      resultManifest = await this.props.downloadRawDataByTypeAndFilter(
        resourceType,
        filter,
        [refFieldInResourceIndex, resourceFieldInResourceIndex]
      );
    }
    resultManifest = resultManifest.filter(
      (x) => !!x[resourceFieldInResourceIndex]
    );
    /* eslint-disable no-param-reassign */
    resultManifest.forEach((x) => {
      if (typeof x[refFieldInResourceIndex] === 'string') {
        x[refFieldInResourceIndex] = [x[refFieldInResourceIndex]];
      }
    });
    return resultManifest.flat();
  };

  getToaster = () => (
    <Toaster
      isEnabled={this.state.toasterOpen}
      className={'explorer-button-group__toaster-div'}
    >
      <Button
        className='explorer-button-group__toaster-button'
        onClick={() => this.closeToaster()}
        label='Close'
        buttonType='primary'
        enabled
      />
      {this.state.exportWorkspaceStatus === 200 ? (
        <Button
          className='explorer-button-group__toaster-button'
          label='Go To Workspace'
          buttonType='primary'
          enabled
          onClick={this.gotoWorkspace}
        />
      ) : null}
      {
        <div className='explorer-button-group__toaster-text'>
          <div> {this.state.toasterHeadline} </div>
          {this.state.exportWorkspaceFileName ? (
            <div>
              {' '}
              Most recent Workspace file name:{' '}
              {this.state.exportWorkspaceFileName}{' '}
            </div>
          ) : null}
          {this.state.exportPFBURL ? (
            <div> Most recent PFB URL: {this.state.exportPFBURL} </div>
          ) : null}
          {this.state.toasterError ? (
            <div> Error: {this.state.toasterError} </div>
          ) : null}
          {this.isPFBRunning() ? <div> {this.state.pfbWarning} </div> : null}
        </div>
      }
    </Toaster>
  );

  getFileCountSum = async () => {
    try {
      const dataType = this.props.guppyConfig.dataType;
      const fileCountField = this.props.guppyConfig.fileCountField;
      const query = `query ($filter: JSON) {
        _aggregation {
          ${dataType} (filter: $filter) {
            ${fileCountField} {
              histogram {
                sum
              }
            }
          }
        }
      }`;
      const body = {
        query,
        variables: { filter: getGQLFilter(this.props.filter) },
      };
      const res = await fetchWithCreds({
        path: guppyGraphQLUrl,
        method: 'POST',
        body: JSON.stringify(body),
      });
      // eslint-disable-next-line no-underscore-dangle
      const totalFileCount =
        res.data.data._aggregation[dataType][fileCountField].histogram[0].sum;
      return totalFileCount;
    } catch (err) {
      throw Error('Error when getting total file count');
    }
  };

  fetchJobResult = async () => this.props.fetchJobResult(this.props.job.uid);

  isPFBRunning = () => this.props.job && this.props.job.status === 'Running';

  gotoWorkspace = () => this.props.history.push('/workspace');

  closeToaster = () => {
    this.setState({
      toasterOpen: false,
      toasterHeadline: '',
      toasterError: null,
      exportPFBStatus: null,
      exportPFBURL: '',
    });
  };

  downloadData = (filename) => () => {
    this.props.downloadRawData().then((res) => {
      if (res) {
        const blob = new Blob([JSON.stringify(res, null, 2)], {
          type: 'text/json',
        });
        FileSaver.saveAs(blob, filename);
      } else {
        throw Error('Error when downloading data');
      }
    });
  };

  downloadManifest = (filename, indexType) => async () => {
    const resultManifest = await this.getManifest(indexType);
    if (resultManifest) {
      const blob = new Blob([JSON.stringify(resultManifest, null, 2)], {
        type: 'text/json',
      });
      FileSaver.saveAs(blob, filename);
    } else {
      throw Error('Error when downloading manifest');
    }
  };

  // REMOVE THIS CODE ONCE TERRA EXPORT WORKS
  // =========================================
  // The below code is a temporary feature for for https://ctds-planx.atlassian.net/browse/PXP-5186
  // (Warn user about Terra entitiy threshold). This code should be removed when
  // Terra is no longer limited to importing <165,000 entities. (~14k subjects).
  // This file is the only file that contains code for this feature.
  exportToTerraWithWarning = () => {
    // If the number of subjects is over the threshold, warn the user that their
    // export to Terra job might fail.
    if (this.props.totalCount >= terraExportWarning.subjectThreshold) {
      this.setState({ enableTerraWarningPopup: true });
    } else {
      // If the number is below the threshold, proceed as normal
      this.exportToTerra();
    }
  };
  // ==========================================

  exportToTerra = () => {
    this.setState({ exportingToTerra: true }, () => {
      this.exportToPFB();
    });
  };

  exportToSevenBridges = () => {
    this.setState({ exportingToSevenBridges: true }, () => {
      this.exportToPFB();
    });
  };

  sendPFBToTerra = () => {
    const url = encodeURIComponent(this.state.exportPFBURL);
    let templateParam = '';
    if (
      typeof this.props.buttonConfig.terraTemplate !== 'undefined' &&
      this.props.buttonConfig.terraTemplate != null
    ) {
      templateParam = this.props.buttonConfig.terraTemplate
        .map((x) => `&template=${x}`)
        .join('');
    }
    window.location = `${this.props.buttonConfig.terraExportURL}?format=PFB${templateParam}&url=${url}`;
  };

  sendPFBToSevenBridges = () => {
    const url = encodeURIComponent(this.state.exportPFBURL);
    window.location = `${this.props.buttonConfig.sevenBridgesExportURL}?format=PFB&url=${url}`;
  };

  exportToPFB = () => {
    this.props.submitJob({
      action: 'export',
      input: { filter: getGQLFilter(this.props.filter) },
    });
    this.props.checkJobStatus();
    this.setState({
      toasterOpen: true,
      toasterHeadline: this.state.pfbStartText,
    });
  };

  exportToWorkspace = async (indexType) => {
    this.setState({ exportingToWorkspace: true });
    const resultManifest = await this.getManifest(indexType);
    if (!!resultManifest && resultManifest.length > 0) {
      fetchWithCreds({
        path: `${manifestServiceApiPath}`,
        body: JSON.stringify(resultManifest),
        method: 'POST',
      }).then(({ status, data }) => {
        switch (status) {
          case 200:
            this.exportToWorkspaceSuccessHandler(data);
            return;
          default:
            this.exportToWorkspaceErrorHandler(status);
        }
      });
    } else {
      this.exportToWorkspaceMessageHandler(
        400,
        'There were no data files found matching the cohort you created.'
      );
    }
  };

  exportToWorkspaceSuccessHandler = (data) => {
    this.setState({
      toasterOpen: true,
      toasterHeadline: this.state.workspaceSuccessText,
      exportWorkspaceStatus: 200,
      exportingToWorkspace: false,
      exportWorkspaceFileName: data.filename,
    });
  };

  exportToWorkspaceErrorHandler = (status) => {
    this.setState({
      toasterOpen: true,
      toasterHeadline: this.state.toasterErrorText,
      exportWorkspaceStatus: status,
      exportingToWorkspace: false,
    });
  };

  exportToWorkspaceMessageHandler = (status, message) => {
    this.setState({
      toasterOpen: true,
      toasterHeadline: message,
      exportWorkspaceStatus: status,
      exportingToWorkspace: false,
    });
  };

  isFileButton = (buttonConfig) =>
    buttonConfig.type === 'manifest' ||
    buttonConfig.type === 'export' ||
    buttonConfig.type === 'export-to-seven-bridges' ||
    buttonConfig.type === 'export-to-workspace' ||
    buttonConfig.type === 'export-to-pfb';

  refreshManifestEntryCount = async () => {
    if (
      this.props.isLocked ||
      !this.props.guppyConfig.manifestMapping ||
      !this.props.guppyConfig.manifestMapping.referenceIdFieldInDataIndex ||
      !this.props.guppyConfig.manifestMapping.referenceIdFieldInResourceIndex
    )
      return;
    const caseField = this.props.guppyConfig.manifestMapping
      .referenceIdFieldInDataIndex;
    const caseFieldInFileIndex = this.props.guppyConfig.manifestMapping
      .referenceIdFieldInResourceIndex;
    if (
      this.props.buttonConfig &&
      this.props.buttonConfig.buttons &&
      this.props.buttonConfig.buttons.some(
        (btnCfg) => this.isFileButton(btnCfg) && btnCfg.enabled
      )
    ) {
      if (this.props.guppyConfig.fileCountField) {
        // if "fileCountField" is set, just ask for sum of file_count field
        const totalFileCount = await this.getFileCountSum();
        this.setState(() => ({
          manifestEntryCount: totalFileCount,
        }));
      } else {
        // otherwise, just query subject index for subject_id list,
        // and query file index for manifest info.
        this.setState({
          manifestEntryCount: 0,
        });
        const caseIDResult = await this.props.downloadRawDataByFields({
          fields: [caseField],
        });
        if (caseIDResult) {
          const caseIDList = caseIDResult.map((i) => i[caseField]);
          const fileType = this.props.guppyConfig.manifestMapping
            .resourceIndexType;
          const countResult = await this.props.getTotalCountsByTypeAndFilter(
            fileType,
            {
              [caseFieldInFileIndex]: {
                selectedValues: caseIDList,
              },
            }
          );
          this.setState({
            manifestEntryCount: countResult,
          });
        } else {
          throw Error('Error when downloading data');
        }
      }
    }
  };

  // check if the user has access to this resource
  isButtonDisplayed = (buttonConfig) => {
    if (
      buttonConfig.type === 'export-to-workspace' ||
      buttonConfig.type === 'export-files-to-workspace'
    ) {
      const authResult = this.props.userAccess.Workspace;
      return typeof authResult !== 'undefined' ? authResult : true;
    }

    return true;
  };

  isButtonEnabled = (buttonConfig) => {
    if (this.props.isLocked) {
      return !this.props.isLocked;
    }
    if (buttonConfig.type === 'manifest') {
      return this.state.manifestEntryCount > 0;
    }
    if (buttonConfig.type === 'export-to-pfb') {
      // disable the pfb export button if any other pfb export jobs are running
      return !(
        this.state.exportingToTerra || this.state.exportingToSevenBridges
      );
    }
    if (buttonConfig.type === 'export') {
      if (!this.props.buttonConfig.terraExportURL) {
        console.error(
          'Export to Terra button is present, but there is no `terraExportURL` specified in the portal config. Disabling the export to Terra button.'
        );
        return false;
      }
      // disable the terra export button if any of the
      // pfb export operations are running.
      return !(
        this.state.exportingToTerra ||
        this.state.exportingToSevenBridges ||
        this.isPFBRunning()
      );
    }
    if (buttonConfig.type === 'export-to-seven-bridges') {
      if (!this.props.buttonConfig.sevenBridgesExportURL) {
        console.error(
          'Export to Terra button is present, but there is no `terraExportURL` specified in the portal config. Disabling the export to Terra button.'
        );
        return false;
      }
      // disable the seven bridges export buttons if any of the
      // pfb export operations are running.
      return !(
        this.state.exportingToTerra ||
        this.state.exportingToSevenBridges ||
        this.isPFBRunning()
      );
    }
    if (buttonConfig.type === 'export-to-workspace') {
      return this.state.manifestEntryCount > 0;
    }

    return this.props.totalCount > 0;
  };

  isButtonPending = (buttonConfig) => {
    if (this.props.isPending) {
      return true;
    }
    if (
      buttonConfig.type === 'export-to-workspace' ||
      buttonConfig.type === 'export-files-to-workspace'
    ) {
      return this.state.exportingToWorkspace;
    }
    if (buttonConfig.type === 'export-to-pfb') {
      // export to pfb button is pending if a pfb export job is running and it's
      // neither an export to terra job or an export to seven bridges job.
      return (
        this.isPFBRunning() &&
        !(this.state.exportingToTerra || this.state.exportingToSevenBridges)
      );
    }
    if (buttonConfig.type === 'export') {
      // export to terra button is pending if a pfb export job is running and
      // it's an exporting to terra job.
      return this.isPFBRunning() && this.state.exportingToTerra;
    }
    if (buttonConfig.type === 'export-to-seven-bridges') {
      // export to seven bridges button is pending if a pfb export job is running
      // and it's an export to seven bridges job.
      return this.isPFBRunning() && this.state.exportingToSevenBridges;
    }
    return false;
  };

  renderButton = (buttonConfig) => {
    if (!this.isButtonDisplayed(buttonConfig)) {
      return null;
    }

    const clickFunc = this.getOnClickFunction(buttonConfig);
    let buttonTitle = buttonConfig.title;
    if (buttonConfig.type === 'data') {
      const buttonCount =
        this.props.totalCount >= 0 ? this.props.totalCount : 0;
      buttonTitle = `${buttonConfig.title} (${buttonCount})`;
    } else if (
      buttonConfig.type === 'manifest' &&
      this.state.manifestEntryCount > 0
    ) {
      buttonTitle = `${buttonConfig.title} (${humanizeNumber(
        this.state.manifestEntryCount
      )})`;
    }
    const btnTooltipText = this.props.isLocked
      ? 'You only have access to summary data'
      : buttonConfig.tooltipText;

    return (
      <Button
        key={buttonConfig.type}
        onClick={clickFunc}
        label={buttonTitle}
        leftIcon={buttonConfig.leftIcon}
        rightIcon={buttonConfig.rightIcon}
        className='explorer-button-group__download-button'
        buttonType='primary'
        enabled={this.isButtonEnabled(buttonConfig)}
        tooltipEnabled={
          buttonConfig.tooltipText ? !this.isButtonEnabled(buttonConfig) : false
        }
        tooltipText={btnTooltipText}
        isPending={this.isButtonPending(buttonConfig)}
      />
    );
  };

  render() {
    const dropdownConfigs = calculateDropdownButtonConfigs(
      this.props.buttonConfig
    );
    return (
      <React.Fragment>
        {
          // REMOVE THIS CODE WHEN EXPORT TO TERRA WORKS
          // ===========================================
          this.state.enableTerraWarningPopup && (
            <Popup
              message={
                terraExportWarning.message
                  ? terraExportWarning.message
                  : `Warning: You have selected more subjects than are currently supported. The import may not succeed. Terra recommends slicing your data into segments of no more than ${terraExportWarning.subjectThreshold.toLocaleString()} subjects and exporting each separately. Would you like to continue anyway?`
              }
              title={
                terraExportWarning.title
                  ? terraExportWarning.title
                  : 'Warning: Export May Fail'
              }
              rightButtons={[
                {
                  caption: 'Yes, Export Anyway',
                  fn: () => {
                    this.setState({ enableTerraWarningPopup: false });
                    this.exportToTerra();
                  },
                  icon: 'external-link',
                },
              ]}
              leftButtons={[
                {
                  caption: 'Cancel',
                  fn: () => this.setState({ enableTerraWarningPopup: false }),
                  icon: 'cross',
                },
              ]}
              onClose={() => this.setState({ enableTerraWarningPopup: false })}
            />
          )
          // ===========================================
        }
        {
          /*
           * First, render dropdown buttons
           * Buttons are grouped under same dropdown if they have the same dropdownID
           * If only one button points to the same dropdownId, it won't be grouped into dropdown
           *   but will only be rendered as sinlge normal button instead.
           */
          dropdownConfigs &&
            Object.keys(dropdownConfigs).length > 0 &&
            Object.keys(dropdownConfigs)
              .filter((dropdownId) => dropdownConfigs[dropdownId].cnt > 1)
              .map((dropdownId) => {
                const entry = dropdownConfigs[dropdownId];
                const btnConfigs = entry.buttonConfigs;
                const dropdownTitle = entry.dropdownConfig.title;
                return (
                  <Dropdown
                    key={dropdownId}
                    className='explorer-button-group__dropdown'
                    disabled={
                      this.props.totalCount === 0 || this.props.isLocked
                    }
                  >
                    <Dropdown.Button>{dropdownTitle}</Dropdown.Button>
                    <Dropdown.Menu>
                      {btnConfigs.map((btnCfg) => {
                        const onClick = this.getOnClickFunction(btnCfg);
                        return (
                          <Dropdown.Item
                            key={btnCfg.type}
                            leftIcon='datafile'
                            rightIcon='download'
                            onClick={onClick}
                          >
                            {btnCfg.title}
                          </Dropdown.Item>
                        );
                      })}
                    </Dropdown.Menu>
                  </Dropdown>
                );
              })
        }
        {
          /**
           * Second, render normal buttons.
           * Buttons without dropdownId are rendered as normal buttons
           * Buttons don't share same dropdownId with others are rendered as normal buttons
           */
          this.props.buttonConfig &&
            this.props.buttonConfig.buttons &&
            this.props.buttonConfig.buttons
              .filter(
                (buttonConfig) =>
                  !dropdownConfigs ||
                  !buttonConfig.dropdownId ||
                  dropdownConfigs[buttonConfig.dropdownId].cnt === 1
              )
              .filter((buttonConfig) => buttonConfig.enabled)
              .map((buttonConfig) => this.renderButton(buttonConfig))
        }
        {this.getToaster()}
      </React.Fragment>
    );
  }
}

ExplorerButtonGroup.propTypes = {
  job: PropTypes.object,
  downloadRawData: PropTypes.func.isRequired, // from GuppyWrapper
  downloadRawDataByFields: PropTypes.func.isRequired, // from GuppyWrapper
  getTotalCountsByTypeAndFilter: PropTypes.func.isRequired, // from GuppyWrapper
  downloadRawDataByTypeAndFilter: PropTypes.func.isRequired, // from GuppyWrapper
  totalCount: PropTypes.number.isRequired, // from GuppyWrapper
  filter: PropTypes.object.isRequired, // from GuppyWrapper
  isPending: PropTypes.bool,
  buttonConfig: ButtonConfigType.isRequired,
  guppyConfig: GuppyConfigType.isRequired,
  history: PropTypes.object.isRequired,
  submitJob: PropTypes.func.isRequired,
  resetJobState: PropTypes.func.isRequired,
  checkJobStatus: PropTypes.func.isRequired,
  fetchJobResult: PropTypes.func.isRequired,
  isLocked: PropTypes.bool.isRequired,
  userAccess: PropTypes.object.isRequired,
};

ExplorerButtonGroup.defaultProps = {
  job: null,
  isPending: false,
};

export default ExplorerButtonGroup;
