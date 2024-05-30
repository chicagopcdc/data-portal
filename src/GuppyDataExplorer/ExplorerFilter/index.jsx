import PropTypes from 'prop-types';
import ConnectedFilter from '../../GuppyComponents/ConnectedFilter';
import { updatePatientIds } from '../../redux/explorer/slice';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import React, { useState, useEffect } from 'react';
import {
  checkIfFilterEmpty,
  FILTER_TYPE,
  pluckFromAnchorFilter,
  pluckFromFilter,
} from '../ExplorerFilterSetWorkspace/utils';
import './ExplorerFilter.css';
import FilterDisplay from '../../components/FilterDisplay';
import Select from '../../components/Select';
import Pill from '../../components/Pill';
import FilterSetLabel from '../ExplorerFilterSetWorkspace/FilterSetLabel';
import { Popover, Dialog, DialogTrigger, Button } from 'react-aria-components';

/** @typedef {import('../../redux/types').RootState} RootState */
/** @typedef {import('../../GuppyComponents/types').StandardFilterState} StandardFilterState */
/** @typedef {import('../types').GuppyData} GuppyData */
/** @typedef {import('../types').SavedExplorerFilterSet} SavedExplorerFilterSet */
/** @typedef {import('../types').ExplorerFilterSet} ExplorerFilterSet */
/** @typedef {import('../types').UnsavedExplorerFilterSet} UnsavedExplorerFilterSet */
/** @typedef {import('../types').ComposedFilterStateWithRef} ComposedFilterStateWithRef */
/** @typedef {import('../types').RefFilterState} RefFilterState */
/** @typedef {import('../../components/Select').SelectItem} SelectItem */
function getSelectedFilterSets(combinedFilter) {
  return (
    combinedFilter.refIds.length < 2 ?
      combinedFilter.refIds.length === 0 ?
      ['', ''] 
      : [...combinedFilter.refIds, ''] 
    : [...combinedFilter.refIds]
  );
}

/** 
 * @typedef {Object} CombinedExplorerFilterProps 
 * @property {string} className
 * @property {any} workspace
 * @property {string} [title]
 * @property {ComposedFilterStateWithRef} combinedFilter
 * @property {GuppyData['onFilterChange']} onFilterChange
 */
/** @param {CombinedExplorerFilterProps} props */
function _CombinedExplorerFilter({ workspace, title = 'Filter', combinedFilter, onFilterChange, className }) {
  const combineFilterSetOptions = Object.entries(workspace.all)
    .filter(([tabId, filterSet]) => {
      return filterSet.filter.__type !== FILTER_TYPE.COMPOSED;
    })
    .map(([tabId, filterSet], i) => {
      return { 
        id: tabId,
        display: <FilterSetLabel hasTooltip={false} filterSet={filterSet} />,
        text: filterSet.name
      };
    });    
  const [selectedFilterSets, setSelectedFilterSets] = useState(getSelectedFilterSets(combinedFilter));
  const [combineMode, setCombineMode] = useState('AND');

  useEffect(() => {
    setSelectedFilterSets(getSelectedFilterSets(combinedFilter));
    setCombineMode(combinedFilter.__combineMode);
  }, [combinedFilter])

  return (
    <div className={className}>
      <div className='explorer-filter__title-container'>
        <h3 className='explorer-filter__title'>{title}</h3>
      </div>
      <div className='explorer-filter__combined-filter-container'>
        <h4 className='explorer-filter__combined-filter-title'>Combine Filters</h4>
        <ul>
          {selectedFilterSets.map((id, index) => {
            return <li key={index.toString() + (id ? id : '')}>
              <div className='explorer-filter__combine-filter-select'>
                {id === '' ? 
                  <Select
                    items={combineFilterSetOptions}
                    disabledKeys={
                      combineFilterSetOptions.filter((option) => {
                          if (selectedFilterSets.indexOf(option.id) === index) {
                            return false;
                          }
                          return selectedFilterSets.includes(option.id);
                      }).map(option => option.id)
                    }
                    onChange={(/** @type {SelectItem} */item) => {
                      let newSelected = [...selectedFilterSets];
                      newSelected[index] = item?.id?.toString() ?? '';
                      setSelectedFilterSets(newSelected);
                      onFilterChange({
                        ...combinedFilter,
                        /** @type {(ComposedFilterStateWithRef | StandardFilterState | RefFilterState)[]} */
                        value: newSelected
                          .filter(id => id !== '')
                          .map(id => {
                            let option = combineFilterSetOptions.find(option => option.id === id)
                            return  { 
                              __type: 'REF',
                              value: {
                                id, label: option.text
                              }
                            };
                          }),
                        refIds: newSelected
                      });
                    }} 
                  />
                  :  <Select
                      items={combineFilterSetOptions}
                      disabledKeys={
                        combineFilterSetOptions.filter((option, i) => {
                            if (selectedFilterSets.indexOf(option.id) === index) {
                              return false;
                            }
                            return selectedFilterSets.includes(option.id);
                        }).map(option => option.id)
                      }
                      onChange={(/** @type {SelectItem} */item) => {
                        let newSelected = [...selectedFilterSets];
                        newSelected[index] = item?.id?.toString() ?? '';
                        setSelectedFilterSets(newSelected);
                        onFilterChange({
                          ...combinedFilter,
                          /** @type {(ComposedFilterStateWithRef | StandardFilterState | RefFilterState)[]} */
                          value: newSelected
                            .filter(id => id !== '')
                            .map(id => {
                              let option = combineFilterSetOptions.find(option => option.id === id)
                              return  { 
                                __type: 'REF',
                                value: {
                                  id, label: option.text
                                }
                              };
                            }),
                          refIds: newSelected
                        });
                      }} 
                      selection={id}
                    />
                }
                <button
                  className='explorer-filter__combine-filter-delete explorer-filter__text-button'
                  disabled={selectedFilterSets.length < 3}
                  onClick={() => {
                    let newSelected = [...selectedFilterSets];
                    let [deleted] = newSelected.splice(index, 1);
                    setSelectedFilterSets(newSelected);
                    onFilterChange(
                      { 
                        ...combinedFilter,
                        /** @type {(ComposedFilterStateWithRef | StandardFilterState | RefFilterState)[]} */
                        value: newSelected
                          .filter(id => id !== '')
                          .map(id => {
                            let option = combineFilterSetOptions.find(option => option.id === id)
                            return  { 
                              __type: 'REF',
                              value: {
                                id, label: option.text
                              }
                            };
                          }),
                        refIds: newSelected
                      },
                      deleted === ''
                    );
                  }}
                >
                  Delete
                </button>
              </div>
              {index < selectedFilterSets.length-1 ? 
                <Pill
                  onClick={() => {
                    /** @type {import('../types').CombineMode} */
                    let newMode = combineMode === 'AND' ? 'OR' : 'AND';
                    setCombineMode(newMode);
                    onFilterChange({ ...combinedFilter, __combineMode: newMode });
                  }}
                >
                    {combineMode}
                </Pill>
                : null
              }
            </li>;
          })}
        </ul>
        <button
          className='explorer-filter__combined-filter-add g3-button g3-button--secondary'
          onClick={() => {
            let newSelected = [...selectedFilterSets];
            newSelected.push('');
            setSelectedFilterSets(newSelected);
            onFilterChange({ ...combinedFilter, refIds: newSelected }, true);
          }}
        >
          Add
        </button>
      </div>
    </div>
  );
}

export const CombinedExplorerFilter = React.memo(_CombinedExplorerFilter);

/**
 * @typedef {Object} ExplorerFilterProps
 * @property {string} [anchorValue]
 * @property {string} [className]
 * @property {string} [title]
 * @property {GuppyData['initialTabsOptions']} [initialTabsOptions]
 * @property {StandardFilterState} filter
 * @property {GuppyData['onFilterChange']} onFilterChange
 * @property {GuppyData['onAnchorValueChange']} onAnchorValueChange
 * @property {GuppyData['tabsOptions']} tabsOptions
 * @property {Object} dictionaryEntries
 * @property {Object} filterUIState
 */

/** @param {ExplorerFilterProps} props */
function ExplorerFilter({ className = '', title = 'Filters', ...filterProps }) {
  const dispatch = useAppDispatch();
  /** @param {RootState['explorer']['patientIds']} ids */
  function handlePatientIdsChange(ids) {
    dispatch(updatePatientIds(ids));
  }
  const {
    config: { adminAppliedPreFilters, filterConfig, guppyConfig },
    patientIds,
  } = useAppSelector((state) => state.explorer);
  const { filter, onFilterChange } = filterProps;

  const connectedFilterProps = {
    ...filterProps,
    adminAppliedPreFilters,
    filterConfig,
    guppyConfig,
    patientIds,
    onPatientIdsChange: handlePatientIdsChange,
  };
  const hasExplorerFilter = !checkIfFilterEmpty(filter);
  const [showQuery, setShowQuery] = useState(false);

    /** @type {import('../../components/FilterDisplay').ClickCombineModeHandler} */
    function handleClickCombineMode(payload) {  
      onFilterChange({
        ...filter,
        __combineMode: payload === 'AND' ? 'OR' : 'AND',
      });
    }

  /** @type {import('../../components/FilterDisplay').ClickFilterHandler} */
  function handleCloseFilter(payload) {
    const { field, anchorField, anchorValue } = payload;
    let newFitler;
    if (anchorField !== undefined && anchorValue !== undefined) {
      const anchor = `${anchorField}:${anchorValue}`;
      newFitler = pluckFromAnchorFilter({ anchor, field, filter });
      onFilterChange(newFitler);
    } else {
      newFitler = pluckFromFilter({ field, filter })
      onFilterChange(newFitler);
    }
    setShowQuery(!checkIfFilterEmpty(newFitler));
  }

  return (
    <div className={className}>
      <div className='explorer-filter__title-container'>
        <h3 className='explorer-filter__title'>{title}</h3>
        { hasExplorerFilter  && (
          <DialogTrigger onOpenChange={(isOpen) => setShowQuery(isOpen)}>
            <Button
              type='button'
              className='explorer-filter__text-button separator-before'
            >
              {showQuery ? 'Hide Query' : 'View Query'}
            </Button>
            <Popover>
              <Dialog>
                <div className='explorer-filter__query-container explorer-filter__query-container--expanded'>
                  <FilterDisplay
                    filter={filter}
                    filterInfo={filterConfig.info}
                    onClickCombineMode={handleClickCombineMode}
                    onCloseFilter={handleCloseFilter}
                  />
                </div>
              </Dialog>
            </Popover>
          </DialogTrigger>
        )}
      </div>
      <ConnectedFilter {...connectedFilterProps} />
    </div>
  );
}

ExplorerFilter.propTypes = {
  anchorValue: PropTypes.string, // from GuppyWrapper
  className: PropTypes.string,
  title: PropTypes.string,
  filter: PropTypes.object.isRequired, // from GuppyWrapper
  initialTabsOptions: PropTypes.object, // from GuppyWrapper
  onAnchorValueChange: PropTypes.func.isRequired, // from GuppyWrapper
  onFilterChange: PropTypes.func.isRequired, // from GuppyWrapper
  tabsOptions: PropTypes.object.isRequired, // from GuppWrapper
  dictionaryEntries: PropTypes.array,
  filterUIState: PropTypes.object.isRequired,
};

export default React.memo(ExplorerFilter);
