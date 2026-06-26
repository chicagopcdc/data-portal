import { useState, useEffect } from 'react';
import Tooltip from 'rc-tooltip';
import 'rc-tooltip/assets/bootstrap_white.css';
import './CovarForm.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Select from 'react-select';
import Button from '../../gen3-ui-component/components/Button';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { overrideSelectTheme } from '../../utils';
import {
  defaultFilterSet,
  ControlFormSelect,
} from '../ExplorerSurvivalAnalysis/ControlForm';
import FilterSetCard from '../ExplorerSurvivalAnalysis/FilterSetCard';
import CovarCard from './CovarCard';
import { getGQLFilter } from '../../GuppyComponents/Utils/queries';
import { resetTableOneResult } from '../../redux/explorer/slice';
import {
  checkIfFilterHasDisallowedVariables,
  checkIfFilterInScope,
} from '../ExplorerSurvivalAnalysis/utils';

/** @typedef {import('./types').ExplorerFilterSet} ExplorerFilterSet */

/** @type {ExplorerFilterSet['id'][]} */
const emptyFilterSetIds = [];

function CovarForm({ onSubmit, options }) {
  // Start here
  const dispatch = useAppDispatch();

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
  const [isCheckingScope, setIsCheckingScope] = useState(false);
  const [filterSetsConsortiumScope, setFilterSetsConsortiumScope] = useState(
    {},
  );

  // Add effect to check scope when filter sets change
  useEffect(() => {
    if (!selectedFilterSet) {
      return;
    }
    const checkFilterSetScopes = async () => {
      setIsCheckingScope(true);
      const scopes = { ...filterSetsConsortiumScope };
      try {
        if (selectedFilterSet.value in scopes) return;

        const inScope = await checkIfFilterInScope(
          consortiums,
          selectedFilterSet.filter,
        );
        scopes[selectedFilterSet.value] = inScope;
      } catch (error) {
        console.error('Error checking filter scope:', error);
        scopes[selectedFilterSet.value] = false;
      } finally {
        if (scopes[selectedFilterSet.value] === false) {
          setSelectedFilterSet(null);
        }
        setFilterSetsConsortiumScope(scopes);
        setIsCheckingScope(false);
      }
    };
    checkFilterSetScopes();
  }, [selectedFilterSet, consortiums]);
  const filterSetOptions = [];
  const usedFilterSets = [];
  for (const filterSet of [defaultFilterSet, ...savedFilterSets]) {
    const { filter, name: label, id: value } = filterSet;
    const isUsed = usedFilterSetIds.includes(value);
    const isDisallowedVariables = checkIfFilterHasDisallowedVariables(
      disallowedVariables,
      filterSet.filter,
    );
    const inScope =
      value in filterSetsConsortiumScope && !filterSetsConsortiumScope[value];
    const isDisabled = isUsed || isDisallowedVariables || inScope;

    let disabledOverlay;
    if (isUsed) {
      disabledOverlay = 'This Filter Set is already in use.';
    } else if (inScope) {
      disabledOverlay = 'This Filter Set contains out of scope consortia.';
    } else if (isDisallowedVariables) {
      disabledOverlay =
        'This Filter Set includes disallowed variables and cannot be used for table one.';
    } else {
      disabledOverlay = '';
    }

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
      filter,
      isDisabled,
    });

    if (isUsed) {
      const isStale = staleFilterSetIdSet.has(value);
      // check if value is in filterSetsConsortiumScope and if not, update the state value with the new value key
      usedFilterSets.push({
        ...filterSet,
        isStale,
      });
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
      if (covariate.type === 'continuous' && covariate.buckets) {
        covariates[covariate.name].buckets = covariate.buckets;
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
    setFilterSetsConsortiumScope({});

    // Reset the Redux state
    dispatch(resetTableOneResult());
  };

  const enableApplyButton =
    usedFilterSets.length > 0 &&
    selectedCovariatesList.length > 0 &&
    Array.from(selectedCovariates).length > 0 &&
    selectedCovariatesList.every(
      (covariate) =>
        Object.keys(covariate).length > 0 &&
        (covariate.type !== 'categorical' ||
          (covariate.selectedKeys && covariate.selectedKeys.length > 0)),
    );

  return (
    <form className='explorer-table-one__control-form'>
      <ControlFormSelect
        inputId='allowed-consortium'
        label={
          <Tooltip
            arrowContent={<div className='rc-tooltip-arrow-inner' />}
            mouseLeaveDelay={0}
            overlay='Table ones can only be generated for Filter Sets that include patients from allowed consortia.'
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
            overlay='Filter sets that use disallowed variables cannot be utilized for Table One analysis.'
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
      <div className='explorer-table-one__filter-group'>
        <div className='explorer-table-one__filter-set-select'>
          <Select
            inputId='table-one-filter-sets'
            placeholder='Select Filter Set to analyze'
            options={filterSetOptions}
            onChange={setSelectedFilterSet}
            maxMenuHeight={160}
            theme={overrideSelectTheme}
            value={selectedFilterSet}
            styles={{
              control: (provided, state) => ({
                ...provided,
                backgroundColor:
                  !state.hasValue &&
                  !state.isFocused &&
                  usedFilterSetIds.length === 0
                    ? 'var(--g3-primary-btn__bg-color)'
                    : provided.backgroundColor,
                borderColor:
                  !state.hasValue &&
                  !state.isFocused &&
                  usedFilterSetIds.length === 0
                    ? 'black'
                    : state.isFocused
                      ? 'var(--pcdc-color__primary-light)'
                      : provided.borderColor,
                boxShadow: state.isFocused
                  ? '0 0 0 2px rgba(0,0,0,0.06)'
                  : provided.boxShadow,
                // Constrain the height to match the button
                height: '40px', // Set specific height
                minHeight: '40px', // Prevent it from getting smaller
                maxHeight: '40px', // Prevent it from getting larger
              }),
              placeholder: (provided, state) => ({
                ...provided,
                color:
                  !state.hasValue &&
                  !state.isFocused &&
                  usedFilterSetIds.length === 0
                    ? 'black'
                    : provided.color,
                fontWeight: 600,
              }),
              valueContainer: (provided) => ({
                ...provided,
                padding: '6px 8px',
                height: '100%', // Ensure content fills the container
              }),
              indicatorsContainer: (provided) => ({
                ...provided,
                height: '100%', // Ensure indicators fill the container
              }),
            }}
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
                buttonType='primary'
                isPending={isCheckingScope}
                enabled={
                  !isCheckingScope &&
                  selectedFilterSet !== null &&
                  usedFilterSetIds.length < 1 &&
                  filterSetsConsortiumScope[selectedFilterSet.value]
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
            Nothing to show here. Try select and use Filter Sets for Table One
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

      <div className='explorer-table-one__button-group'>
        {/* Add Variable button in its own container */}
        <div className='explorer-table-one__add-variable-section'>
          <Button
            label='Add Variable'
            buttonType={
              usedFilterSetIds.length >= 1 &&
              selectedCovariatesList.length === 0
                ? 'primary'
                : 'default'
            }
            onClick={() => setCovariatesList((prev) => [...prev, {}])}
          />
        </div>
        <div className='explorer-table-one__action-buttons'>
          <Button label='Reset' buttonType='default' onClick={resetUserInput} />
          {enableApplyButton ? (
            <Button
              label='Apply'
              buttonType='primary'
              onClick={submitUserInput}
              enabled={true}
            />
          ) : (
            <Tooltip
              arrowContent={<div className='rc-tooltip-arrow-inner' />}
              mouseLeaveDelay={0}
              overlay={'You are missing some required fields'}
              placement='right'
            >
              <span>
                <Button label='Apply' buttonType='default' enabled={false} />
              </span>
            </Tooltip>
          )}
        </div>
      </div>
    </form>
  );
}
export default CovarForm;
