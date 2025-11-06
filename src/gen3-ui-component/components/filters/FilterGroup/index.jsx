import { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import cloneDeep from 'lodash.clonedeep';
import Select from 'react-select';
import { overrideSelectTheme } from '../../../../utils';
import AnchorFilter from '../AnchorFilter';
import FilterSection from '../FilterSection';
import PatientIdFilter from '../PatientIdFilter';
import {
  clearFilterSection,
  FILTER_TYPE,
  getExcludedStatus,
  getExpandedStatus,
  getFilterStatus,
  getSelectedAnchors,
  tabHasActiveFilters,
  updateCombineMode,
  updateExclusion,
  updateRangeValue,
  updateSelectedValue,
  removeEmptyFilter,
} from './utils';
import { capitalizeFirstLetter } from '../../../../utils';
import './FilterGroup.css';

/** @param {string} label */
function findFilterElement(label) {
  const selector = 'div.g3-filter-section__title-container';
  /** @type {NodeListOf<HTMLDivElement>} */
  const sectionTitleElements = document.querySelectorAll(selector);

  for (const el of sectionTitleElements)
    if (label === el.attributes['aria-label'].value.split(': ')[1]) {
      el.focus();
      break;
    }
}

/** @typedef {import('../types').EmptyFilter} EmptyFilter */
/** @typedef {import('../types').FilterChangeHandler} FilterChangeHandler */
/** @typedef {import('../types').FilterConfig} FilterConfig */
/** @typedef {import('../../../../GuppyDataExplorer/types').PatientIdsConfig} PatientIdsConfig */
/** @typedef {import('../types').FilterSectionConfig} FilterSectionConfig */
/** @typedef {import('../types').StandardFilterState} StandardFilterState */
/** @typedef {import('../types').OptionFilter} OptionFilter */

/**
 * @typedef {Object} UnitCalcParams
 * @property {string} quantity
 * @property {string} desiredUnit
 * @property {Object<string, number>} selectUnits
 */

/**
 * @typedef {Object} FilterGroupProps
 * @property {string} [anchorValue]
 * @property {string} [className]
 * @property {string} [disabledTooltipMessage]
 * @property {EmptyFilter | StandardFilterState} [filter]
 * @property {FilterConfig} filterConfig
 * @property {PatientIdsConfig} patientIdsConfig
 * @property {boolean} [hideZero]
 * @property {string} [lockedTooltipMessage]
 * @property {(anchorValue: string) => void} [onAnchorValueChange]
 * @property {FilterChangeHandler} [onFilterChange]
 * @property {FilterSectionConfig[][]} tabs
 * @property {UnitCalcParams} [unitCalcConfig]
 */

const defaultExplorerFilter = {};

/** @param {FilterGroupProps} props */
function FilterGroup({
  anchorValue = '',
  className = '',
  disabledTooltipMessage,
  filterConfig,
  patientIdsConfig,
  hideZero = true,
  filter = defaultExplorerFilter,
  lockedTooltipMessage,
  onAnchorValueChange = () => {},
  onFilterChange = () => {},
  tabs,
}) {
  const filterTabs = filterConfig.tabs.map(
    ({ title, fields, searchFields }) => ({
      title,
      // If there are any search fields, insert them at the top of each tab's fields.
      fields: searchFields ? searchFields.concat(fields) : fields,
    }),
  );

  // pulls info about which range filters use what quantity (e.g. age or number) from pcdc.json
  // unitCalcTitles.age contains all titles with the age quantity, and unitCalcTitles.number
  // contains all titles with the number quantity

  // for backwards compatibility, if filterConfig.unitCalcConfig is undefined,
  // no unit calculator is shown on any range filter (all range filters are numeric)
  const unitCalcTitles = !filterConfig.unitCalcConfig
    ? { number: [], age: [] }
    : filterConfig.unitCalcConfig.calculatorMapping;

  const [tabIndex, setTabIndex] = useState(0);
  const tabTitle = filterTabs[tabIndex].title;
  const showAnchorFilter =
    filterConfig.anchor !== undefined &&
    filterConfig.anchor.tabs.includes(tabTitle);
  const showPatientIdsFilter =
    patientIdsConfig?.filter === true && tabTitle === 'Subject';

  const anchorLabel =
    filterConfig.anchor !== undefined && anchorValue !== '' && showAnchorFilter
      ? `${filterConfig.anchor.field}:${anchorValue}`
      : '';

  const [expandedStatusControl, setExpandedStatusControl] = useState(false);
  const expandedStatusText = expandedStatusControl
    ? 'Collapse all'
    : 'Open all';
  const [expandedStatus, setExpandedStatus] = useState(
    getExpandedStatus(filterTabs, false),
  );

  const [filterResults, setFilterResults] = useState(filter);

  const [excludedStatus, setExcludedStatus] = useState(
    getExcludedStatus(filterTabs, filterResults),
  );

  /** Takes in a filter's filter name and returns its display name
   * @returns {string} newFilterName - the display name of the filter, with capitals
   */
  function toDisplayName(filter) {
    for (const key in Object.keys(filterConfig.info)) {
      if (filter === key) {
        return filterConfig.info[key].label;
      }
    }
    const periodIdx = filter.indexOf('.');
    let newFilterName = filter;
    if (periodIdx !== -1) {
      newFilterName = filter.slice(periodIdx + 1);
    }
    return capitalizeFirstLetter(newFilterName);
  }

  // default pulled from pcdc.json
  const FALLBACK_FILTER_DEPENDENCY_CONFIG = {
    filterToRelation: {
      'molecular_analysis.molecular_abnormality': 'molecular_abnormality',
      'molecular_analysis.molecular_abnormality_result':
        'molecular_abnormality',
      'tumor_assessments.tumor_state': 'tumor_site_state',
      'tumor_assessments.tumor_site': 'tumor_site_state',
      'stagings.stage_system': 'stage',
      'stagings.stage': 'stage',
      'minimal_residual_diseases.mrd_result_numeric': 'mrd_result',
      'minimal_residual_diseases.mrd_result_unit': 'mrd_result',
      'labs.lab_result_numeric': 'lab_result',
      'labs.lab_result_unit': 'lab_result',
    },
    relations: [], // empty
  };

  // Current values from gitops, checking if value is missing
  let filterToRelation =
    filterConfig?.filterDependencyConfig?.filterToRelation ?? null;

  let relations = Array.isArray(filterConfig?.filterDependencyConfig?.relations)
    ? filterConfig.filterDependencyConfig.relations
    : [];

  // check for invalid or empty
  if (!filterToRelation) {
    console.warn(
      'filterToRelation invalid; using FALLBACK_FILTER_DEPENDENCY_CONFIG.',
    );
    filterToRelation = FALLBACK_FILTER_DEPENDENCY_CONFIG.filterToRelation;
  }
  if (relations.length === 0) {
    console.warn('relations invalid; using FALLBACK_FILTER_DEPENDENCY_CONFIG.');
    relations = FALLBACK_FILTER_DEPENDENCY_CONFIG.relations;
  }

  const [filterStatus, setFilterStatus] = useState(
    getFilterStatus({
      anchorConfig: filterConfig.anchor,
      filterResults: filter,
      filterTabs,
    }),
  );
  const isInitialRenderRef = useRef(true);
  useEffect(() => {
    if (isInitialRenderRef.current) {
      isInitialRenderRef.current = false;
      return;
    }

    const newFilterStatus = getFilterStatus({
      anchorConfig: filterConfig.anchor,
      filterResults: filter,
      filterTabs,
    });
    const newFilterResults = filter;

    setFilterStatus(newFilterStatus);
    setFilterResults(newFilterResults);
  }, [filter]);

  const filterTabStatus = showAnchorFilter
    ? filterStatus[tabIndex][anchorLabel]
    : filterStatus[tabIndex];

  const selectedAnchors = getSelectedAnchors(filterStatus);

  /**
   * @param {number} sectionIndex
   * @param {boolean} isExpanded
   */
  function handleToggleSection(sectionIndex, isExpanded) {
    const newExpandedStatus = cloneDeep(expandedStatus);
    newExpandedStatus[tabIndex][sectionIndex] = isExpanded;
    setExpandedStatus(newExpandedStatus);
  }

  /** @param {number} sectionIndex */
  function handleClearSection(sectionIndex) {
    const updated = clearFilterSection({
      filterStatus,
      filterResults,
      filterTabs,
      tabIndex,
      anchorLabel,
      sectionIndex,
    });
    setFilterResults(updated.filterResults);
    setFilterStatus(updated.filterStatus);
    onFilterChange(updated.filterResults);
  }

  /**
   * @param {number} sectionIndex
   * @param {string} combineModeFieldName
   * @param {string} combineModeValue
   */
  function handleToggleCombineMode(
    sectionIndex,
    combineModeFieldName,
    combineModeValue,
  ) {
    const updated = updateCombineMode({
      filterStatus,
      filterResults,
      filterTabs,
      tabIndex,
      anchorLabel,
      sectionIndex,
      combineModeFieldName,
      combineModeValue,
    });
    setFilterStatus(updated.filterStatus);
    setFilterResults(updated.filterResults);

    // If no other filter is applied, the combineMode is not yet useful to Guppy
    const field = filterTabs[tabIndex].fields[sectionIndex];
    const filterValues = filterResults[field];
    if (
      filterValues.__type === FILTER_TYPE.OPTION &&
      filterValues.selectedValues.length > 0
    )
      onFilterChange(updated.filterResults);
  }

  /**
   * @param {number} sectionIndex
   * @param {string} selectedValue
   * @param {boolean} isExclusion
   */
  function handleSelect(sectionIndex, selectedValue, isExclusion) {
    const updated = updateSelectedValue({
      filterStatus,
      filterResults,
      filterTabs,
      tabIndex,
      anchorLabel,
      sectionIndex,
      selectedValue,
      isExclusion,
    });
    setFilterStatus(updated.filterStatus);
    setFilterResults(updated.filterResults);
    onFilterChange(updated.filterResults);
  }

  /**
   * Handles a list of patient IDs.
   * @param {string[]} inputPatientIds - Array of patient ID strings.
   */
  function handlePatientIdsChange(inputPatientIds) {
    let newFilterResults = cloneDeep(filterResults);
    if (!('value' in newFilterResults)) {
      newFilterResults = { value: {} };
    }
    /** @type {OptionFilter} */
    newFilterResults.value['subject_submitter_id'] = {
      selectedValues: inputPatientIds,
      __type: 'OPTION',
      isExclusion: false,
    };
    setFilterResults(newFilterResults);
    onFilterChange(newFilterResults);
  }

  function retrieveFilterPatientIds() {
    if (!('value' in filterResults)) {
      return [];
    }
    if (
      'subject_submitter_id' in filterResults.value &&
      filterResults.value['subject_submitter_id']?.__type === 'OPTION'
    ) {
      const patientIds =
        filterResults.value['subject_submitter_id'].selectedValues || [];
      return patientIds;
    }
    return [];
  }

  function handleClearPatientIds() {
    let newFilterResults = cloneDeep(filterResults);
    if (!('value' in newFilterResults)) {
      newFilterResults = { value: {} };
    }
    if ('subject_submitter_id' in newFilterResults.value) {
      delete newFilterResults.value['subject_submitter_id'];
    }
    setFilterResults(newFilterResults);
    onFilterChange(newFilterResults);
  }

  /**
   * @param {number} sectionIndex
   * @param {boolean} isExclusion
   */
  function handleToggleExclusion(sectionIndex, isExclusion) {
    const updated = updateExclusion({
      filterResults,
      filterTabs,
      tabIndex,
      anchorLabel,
      sectionIndex,
      isExclusion,
    });

    setExcludedStatus(
      getExcludedStatus(filterTabs, updated.filterResults, excludedStatus),
    );
    setFilterResults(removeEmptyFilter(updated.filterResults));
    onFilterChange(removeEmptyFilter(updated.filterResults));
  }

  /**
   * @param {number} sectionIndex
   * @param {number} lowerBound
   * @param {number} upperBound
   * @param {number} minValue
   * @param {number} maxValue
   * @param {number} rangeStep
   */
  function handleDrag(
    sectionIndex,
    lowerBound,
    upperBound,
    minValue,
    maxValue,
    rangeStep = 1,
  ) {
    const updated = updateRangeValue({
      filterStatus,
      filterResults,
      filterTabs,
      tabIndex,
      anchorLabel,
      sectionIndex,
      lowerBound,
      upperBound,
      minValue,
      maxValue,
      rangeStep,
    });
    setFilterStatus(updated.filterStatus);
    setFilterResults(updated.filterResults);
    onFilterChange(updated.filterResults);
  }

  function toggleSections() {
    const newExpandedStatusControl = !expandedStatusControl;
    setExpandedStatusControl(newExpandedStatusControl);
    setExpandedStatus(getExpandedStatus(filterTabs, newExpandedStatusControl));
  }

  const filterFinderOptions = filterTabs.map((tab, index) => ({
    label: tab.title,
    options: tabs[index].map((section) => ({
      label: section.title,
      value: { index, title: section.title },
    })),
  }));
  const filterToFind = useRef('');
  useEffect(() => {
    if (filterToFind.current !== '') {
      findFilterElement(filterToFind.current);
      filterToFind.current = '';
    }
  }, [tabIndex]);

  /** @param {{ value: { index: number; title: string }}} option */
  function handleFindFilter({ value }) {
    if (tabIndex !== value.index) {
      filterToFind.current = value.title;
      setTabIndex(value.index);
    } else {
      findFilterElement(value.title);
    }
  }

  /** Returns a list of display names for filters, to be used for configuring dependentFilters */
  function createDependentFiltersArr(origfilterNames, currentFilterName) {
    const newfilterNames = [];
    for (const filterName of origfilterNames) {
      if (filterName != currentFilterName) {
        newfilterNames.push(toDisplayName(filterName));
      }
    }
    return newfilterNames;
  }

  return (
    <div className={`g3-filter-group ${className}`}>
      <Select
        className='g3-filter-group__filter-finder'
        placeholder='Find filter to use'
        onChange={handleFindFilter}
        options={filterFinderOptions}
        theme={overrideSelectTheme}
        value={null}
      />
      <div className='g3-filter-group__tabs'>
        {tabs.map((_, index) => (
          <div
            key={index}
            className={'g3-filter-group__tab'.concat(
              tabIndex === index ? ' g3-filter-group__tab--selected' : '',
            )}
            onClick={() => setTabIndex(index)}
            onKeyPress={(e) => {
              if (e.charCode === 13 || e.charCode === 32) {
                e.preventDefault();
                setTabIndex(index);
              }
            }}
            role='button'
            tabIndex={0}
            aria-label={`Filter group tab: ${filterTabs[index].title}`}
          >
            <p
              className={`g3-filter-group__tab-title ${
                tabHasActiveFilters(filterStatus[index])
                  ? 'g3-filter-group__tab-title--has-active-filters'
                  : ''
              }`}
            >
              {filterTabs[index].title}
            </p>
          </div>
        ))}
      </div>
      <div className='g3-filter-group__collapse'>
        <span
          className='g3-link g3-filter-group__collapse-link'
          onClick={toggleSections}
          onKeyPress={(e) => {
            if (e.charCode === 13 || e.charCode === 32) {
              e.preventDefault();
              toggleSections();
            }
          }}
          role='button'
          tabIndex={0}
          aria-label={expandedStatusText}
        >
          {expandedStatusText}
        </span>
      </div>
      <div className='g3-filter-group__filter-area'>
        {showAnchorFilter && (
          <AnchorFilter
            anchorField={filterConfig.anchor.field}
            anchorValue={anchorValue}
            onChange={onAnchorValueChange}
            options={filterConfig.anchor.options}
            optionsInUse={selectedAnchors[tabIndex]}
            tooltip={filterConfig.anchor.tooltip}
          />
        )}
        {showPatientIdsFilter && (
          <PatientIdFilter
            getPatientIds={retrieveFilterPatientIds}
            handlePatientIdsChange={handlePatientIdsChange}
            handleClearPatientIds={handleClearPatientIds}
          />
        )}
        {tabs[tabIndex].map((section, index) => {
          const filterName = filterTabs[tabIndex].fields[index];
          const relationName = filterToRelation[filterName];
          const depFilters = Object.keys(filterToRelation);
          return (
            <FilterSection
              key={section.title}
              sectionTitle={section.title}
              disabledTooltipMessage={disabledTooltipMessage}
              excluded={excludedStatus[tabIndex][index]}
              expanded={expandedStatus[tabIndex][index]}
              filterStatus={filterTabStatus[index]}
              hideZero={hideZero}
              isArrayField={section.isArrayField}
              isSearchFilter={section.isSearchFilter}
              lockedTooltipMessage={lockedTooltipMessage}
              onAfterDrag={(...args) => handleDrag(index, ...args)}
              onClear={() => handleClearSection(index)}
              onSearchFilterLoadOptions={section.onSearchFilterLoadOptions}
              onSelect={(label, isExclusion) =>
                handleSelect(index, label, isExclusion)
              }
              onToggle={(isExpanded) => handleToggleSection(index, isExpanded)}
              onToggleCombineMode={(...args) =>
                handleToggleCombineMode(index, ...args)
              }
              onToggleExclusion={(isExclusion) =>
                handleToggleExclusion(index, isExclusion)
              }
              options={section.options}
              title={section.title}
              tooltip={section.tooltip}
              dependentFilters={
                depFilters.includes(filterName)
                  ? createDependentFiltersArr(
                      relations[relationName],
                      filterName,
                    )
                  : false
              }
              unitCalcType={
                unitCalcTitles.age.includes(filterTabs[tabIndex].fields[index])
                  ? 'age'
                  : 'number'
              }
              unitCalcConfig={
                filterConfig.unitCalcConfig
                  ? filterConfig.unitCalcConfig.ageUnits
                  : null
              }
            />
          );
        })}
      </div>
    </div>
  );
}

FilterGroup.propTypes = {
  anchorValue: PropTypes.string,
  className: PropTypes.string,
  disabledTooltipMessage: PropTypes.string,
  filter: PropTypes.object,
  filterConfig: PropTypes.shape({
    anchor: PropTypes.shape({
      field: PropTypes.string,
      options: PropTypes.arrayOf(PropTypes.string),
      tabs: PropTypes.arrayOf(PropTypes.string),
      tooltip: PropTypes.string,
    }),
    tabs: PropTypes.arrayOf(
      PropTypes.shape({
        title: PropTypes.string,
        fields: PropTypes.arrayOf(PropTypes.string),
        searchFields: PropTypes.arrayOf(PropTypes.string),
      }),
    ),
  }).isRequired,
  hideZero: PropTypes.bool,
  lockedTooltipMessage: PropTypes.string,
  onAnchorValueChange: PropTypes.func,
  onFilterChange: PropTypes.func,
  tabs: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.object)).isRequired,
};

export default FilterGroup;
