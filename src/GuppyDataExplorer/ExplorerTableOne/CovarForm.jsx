import { useState } from 'react';
import Tooltip from 'rc-tooltip';
import 'rc-tooltip/assets/bootstrap_white.css';
import Select from 'react-select';
import Button from '../../gen3-ui-component/components/Button';
import { useAppSelector } from '../../redux/hooks';
import { overrideSelectTheme } from '../../utils';
import {
  defaultFilterSet,
  ControlFormSelect,
} from '../ExplorerSurvivalAnalysis/ControlForm';
import FilterSetCard from '../ExplorerSurvivalAnalysis/FilterSetCard';
import CovarCard from './CovarCard';
import { getGQLFilter } from '../../GuppyComponents/Utils/queries';
import './ExplorerTableOne.css';
import {
  checkIfFilterHasDisallowedVariables,
  checkIfFilterInScope,
} from '../ExplorerSurvivalAnalysis/utils';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

/** @typedef {import('./types').ExplorerFilterSet} ExplorerFilterSet */

/** @type {ExplorerFilterSet['id'][]} */
const emptyFilterSetIds = [];

function CovarForm({ onSubmit, options }) {
  // Start here

  const savedFilterSets = useAppSelector(
    (state) => state.explorer.savedFilterSets.data,
  );

  const staleFilterSetIdSet = useAppSelector(
    (state) => new Set(state.explorer.survivalAnalysisResult.staleFilterSetIds),
  );

  const consortiums = useAppSelector(
    (state) => state.explorer.config.tableOneConfig.consortium ?? [],
  );
  const disallowedVariables = useAppSelector(
    (state) => state.explorer.config.tableOneConfig.excludedVariables ?? [],
  );

  const [isInputChanged, setIsInputChanged] = useState(false);

  const [selectedFilterSet, setSelectedFilterSet] = useState(null);
  const [usedFilterSetIds, setUsedFilterSetIds] = useState(emptyFilterSetIds);
  const [selectedCovariatesList, setCovariatesList] = useState([]);
  const [selectedCovariates, setSelectedCovariates] = useState(new Set());

  const filterSetOptions = [];
  const usedFilterSets = [];
  for (const filterSet of [defaultFilterSet, ...savedFilterSets]) {
    const { name: label, id: value } = filterSet;
    const isUsed = usedFilterSetIds.includes(value);
    const isOutOfScope = !checkIfFilterInScope(consortiums, filterSet.filter);
    const isDisallowedVariables = checkIfFilterHasDisallowedVariables(
      disallowedVariables,
      filterSet.filter,
    );
    const isDisabled = isUsed || isOutOfScope || isDisallowedVariables;

    const disabledOverlay = isUsed
      ? 'This Filter Set is already in use.'
      : isOutOfScope
        ? 'This Filter Set includes out of scope consortia.'
        : isDisallowedVariables
          ? 'This Filter Set includes disallowed variables and cannot be used for survival analysis.'
          : '';

    filterSetOptions.push({
      label: isDisabled ? (
        <Tooltip
          arrowContent={<div className='rc-tooltip-arrow-inner' />}
          mouseLeaveDelay={0}
          overlay={disabledOverlay}
          placement='right'
        >
          <span>{label}</span>
        </Tooltip>
      ) : (
        label
      ),
      value,
      isDisabled,
    });

    if (isUsed) {
      const isStale = staleFilterSetIdSet.has(value);
      usedFilterSets.push({ ...filterSet, isStale });
    }
  }

  const submitUserInput = () => {
    setIsInputChanged(false);
    const filterSets = [];
    for (const filterSet of usedFilterSets) {
      const { filter, id, explorerId, name } = filterSet;

      filterSets.push({
        filter: getGQLFilter(filter) ?? {},
        id: id,
        //this isnt getting loaded in with SavedFilterSets
        explorerId: explorerId,
        name: name,
      });
    }
    const covariates = {};
    for (const covariate of selectedCovariatesList) {
      covariates[covariate.name] = {
        label: covariate.label,
        type: covariate.type,
      };
      if (covariate.type === 'categorical') {
        covariates[covariate.name].selectedKeys = covariate.selectedKeys; // ✅ Fixed!
      }
    }

    onSubmit({
      covariates,
      filterSets,
    });
  };

  const resetUserInput = () => {
    setSelectedFilterSet(null);
    setCovariatesList([]);
    setSelectedCovariates(new Set());
    setUsedFilterSetIds([]);
    setIsInputChanged(false);
  };

  return (
    <form className='explorer-survival-analysis__control-form'>
      <ControlFormSelect
        inputId='allowed-consortium'
        label={
          <Tooltip
            arrowContent={<div className='rc-tooltip-arrow-inner' />}
            mouseLeaveDelay={0}
            overlay='Survival curves can only be generated for Filter Sets that include patients from allowed consortia.'
            placement='left'
          >
            <span>
              <FontAwesomeIcon
                icon='circle-info'
                color='var(--pcdc-color__primary-light)'
              />{' '}
              Allowed Consortia
            </span>
          </Tooltip>
        }
        components={{
          IndicatorsContainer: () => null,
          MultiValueRemove: () => null,
        }}
        isMulti
        isDisabled
        value={consortiums.map((label) => ({ label }))}
        theme={overrideSelectTheme}
      />
      <ControlFormSelect
        inputId='disallowed-variables'
        label={
          <Tooltip
            arrowContent={<div className='rc-tooltip-arrow-inner' />}
            mouseLeaveDelay={0}
            overlay='Filter sets that use disallowed variables cannot be utilized for survival analysis'
            placement='left'
          >
            <span>
              <FontAwesomeIcon
                icon='circle-info'
                color='var(--pcdc-color__primary-light)'
              />{' '}
              Disallowed Variables
            </span>
          </Tooltip>
        }
        components={{
          IndicatorsContainer: () => null,
          MultiValueRemove: () => null,
        }}
        isMulti
        isDisabled
        value={disallowedVariables}
        theme={overrideSelectTheme}
      />
      <div className='explorer-survival-analysis__filter-group'>
        <div className='explorer-survival-analysis__filter-set-select'>
          <Select
            inputId='survival-filter-sets'
            placeholder='Select Filter Set to analyze'
            options={filterSetOptions}
            onChange={setSelectedFilterSet}
            maxMenuHeight={160}
            value={selectedFilterSet}
            theme={overrideSelectTheme}
            menuPlacement='auto'
          />
          {usedFilterSetIds.length >= 1 ? (
            <Tooltip
              arrowContent={<div className='rc-tooltip-arrow-inner' />}
              mouseLeaveDelay={0}
              overlay={'Only 1 Filter Set Can Be Selected'}
              placement='top'
            >
              <span>
                <Button label='Add' buttonType='default' enabled={false} />
              </span>
            </Tooltip>
          ) : (
            <span>
              <Button
                label='Add'
                buttonType='default'
                enabled={
                  selectedFilterSet !== null && usedFilterSetIds.length < 1
                }
                onClick={() => {
                  setUsedFilterSetIds((ids) => [
                    ...ids,
                    selectedFilterSet.value,
                  ]);
                  setSelectedFilterSet(null);
                }}
              />
            </span>
          )}
        </div>
        {usedFilterSets.length === 0 ? (
          <span style={{ fontStyle: 'italic' }}>
            Nothing to show here. Try select and use Filter Sets for survival
            analysis.
          </span>
        ) : (
          usedFilterSets.map((filterSet) => (
            <FilterSetCard
              key={filterSet.id}
              filterSet={filterSet}
              label={filterSet.name}
              onClose={() => {
                setUsedFilterSetIds((ids) =>
                  ids.filter((id) => id !== filterSet.id),
                );
              }}
            />
          ))
        )}
      </div>
      {selectedCovariatesList.map((e, index) => {
        return (
          <CovarCard
            postion={index}
            covariates={selectedCovariatesList}
            updateCovariates={setCovariatesList}
            selectedCovariates={selectedCovariates}
            setSelectedCovariates={setSelectedCovariates}
            option={options}
          />
        );
      })}

      <div className='explorer-survival-analysis__button-group'>
        <Button
          label='Add Variable'
          buttonType='default'
          onClick={() => setCovariatesList((prev) => [...prev, {}])}
        />
      </div>
      <div className='explorer-survival-analysis__button-group'>
        <Button label='Reset' buttonType='default' onClick={resetUserInput} />
        <Button
          label='Apply'
          buttonType='primary'
          onClick={submitUserInput}
          enabled={
            usedFilterSets.length > 0 &&
            selectedCovariatesList.length > 0 &&
            Array.from(selectedCovariates).length > 0
          }
        />
      </div>
    </form>
  );
}
export default CovarForm;
