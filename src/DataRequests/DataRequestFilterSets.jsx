import { useCallback, useEffect, useState } from 'react';
import Button from '../gen3-ui-component/components/Button';
import SimplePopup from '../components/SimplePopup';
import ExplorerFilterDisplay from '../GuppyDataExplorer/ExplorerFilterDisplay';
import '../GuppyDataExplorer/ExplorerFilterSetForms/ExplorerFilterSetForms.css';
import './DataRequestFilterSets.css';
import {
  addFiltersetToRequest,
  getProjectFilterSets,
  removeFiltersetFromRequest,
} from '../redux/dataRequest/asyncThunks';
import { useAppDispatch, useAppSelector } from '../redux/hooks';
import { getFilterState } from '../GuppyComponents/Utils/queries';
import { FilterSetOpenFormFields } from '../GuppyDataExplorer/ExplorerFilterSetForms/FilterSetOpenForm';
import { fetchWithToken } from '../redux/explorer/filterSetsAPI';
const hasKeys = (obj) =>
  !!obj && typeof obj === 'object' && Object.keys(obj).length > 0;

/** Mirrors the three groups ("Explorer", "Manual", "Subject Submitter Ids Only") rendered below */
function isListedFilterSet(filterSet) {
  if (filterSet.filter_object) return true;
  if (filterSet.filter_source_internal_id) return false;
  return hasKeys(filterSet.graphql_object) || !!filterSet.ids_list;
}

/**
 * The request failed if the thunk was rejected (e.g. network error, no
 * `payload.isError`) or resolved with an error payload.
 */
function didRequestFail(action) {
  return Boolean(action.error) || !action.payload || action.payload.isError;
}

/**
 * amanuensis can answer with an HTML page, so only show the reason it gave
 * when it is a short plain message, followed by the likely cause.
 */
function getFailureMessage(action, summary, hint) {
  const reason = action.payload?.message;
  const detail =
    typeof reason === 'string' &&
    reason.length < 200 &&
    !reason.trim().startsWith('<')
      ? reason
      : '';
  return [summary, detail, hint].filter(Boolean).join(' ');
}

export default function DataRequestFilterSets({
  projectId,
  savedFilterSets,
  onAction,
  admin = false,
}) {
  const dispatch = useAppDispatch();
  const [changeFilterSetRequestError, setChangeFilterSetRequestError] =
    useState({ isError: false, message: '' });
  const [
    fetchProjectFilterSetRequestError,
    setFetchProjectFilterSetRequestError,
  ] = useState({ isError: false, message: '' });

  const [selectedFiltersetId, setSelectedFiltersetId] = useState(undefined);
  const [copyFilterAsJson, setCopyFilterAsJson] = useState(false);
  const [projectFilterSets, setProjectFilterSets] = useState([]);
  const [filterSetToRemove, setFilterSetToRemove] = useState(null);

  // a project has to keep at least one filter set; only count the ones listed
  // below, since those are the ones an admin can see
  const canRemoveFilterSets =
    projectFilterSets.filter(isListedFilterSet).length > 1;

  const fetchProjectFilterSets = (projectId) => {
    const actionRequest =
      /** @type {import("../redux/dataRequest/types").Request} */
      (dispatch(getProjectFilterSets(projectId)));
    actionRequest.then((action) => {
      if (action.payload.isError) {
        setProjectFilterSets([]);
        setFetchProjectFilterSetRequestError({
          isError: true,
          message: action.payload.message,
        });
      } else {
        setProjectFilterSets(action.payload.data);
        setFetchProjectFilterSetRequestError({
          isError: false,
          message: '',
        });
      }
    });
  };

  const submitFilterset = async (filtersetId) => {
    setChangeFilterSetRequestError({ isError: false, message: '' });
    const actionRequest =
      /** @type {import("../redux/dataRequest/types").Request} */
      (
        dispatch(
          addFiltersetToRequest({
            filtersetId,
            projectId: projectId,
            mode: 'add',
          }),
        )
      );
    actionRequest.then((action) => {
      if (!didRequestFail(action)) {
        onAction?.('SUCCESSFUL_FILTER_SET_CHANGE');
        fetchProjectFilterSets(projectId);
      } else {
        setChangeFilterSetRequestError({
          isError: true,
          message: getFailureMessage(
            action,
            'Unable to add this filter set to the project request.',
            'If the project is already at its filter set limit, remove one first.',
          ),
        });
      }
    });
  };

  const removeFilterset = async (searchId) => {
    // close the confirmation right away so it cannot be submitted twice
    setFilterSetToRemove(null);
    setChangeFilterSetRequestError({ isError: false, message: '' });
    const actionRequest =
      /** @type {import("../redux/dataRequest/types").Request} */
      (
        dispatch(
          removeFiltersetFromRequest({
            searchIds: [searchId],
            projectId: projectId,
          }),
        )
      );
    actionRequest.then((action) => {
      if (!didRequestFail(action)) {
        onAction?.('SUCCESSFUL_FILTER_SET_CHANGE');
        fetchProjectFilterSets(projectId);
      } else {
        setChangeFilterSetRequestError({
          isError: true,
          message: getFailureMessage(
            action,
            'Unable to remove this filter set from the project request.',
            'A project has to keep at least one filter set.',
          ),
        });
      }
    });
  };

  useEffect(() => {
    fetchProjectFilterSets(projectId);
  }, [projectId]);

  const addFilter = useCallback((actionState) => {
    if (!actionState?.value) return;

    const nextId = actionState.value.id;
    setSelectedFiltersetId((prev) => (prev === nextId ? prev : nextId));

    setChangeFilterSetRequestError((prev) =>
      prev.isError ? { isError: false, message: '' } : prev,
    );
  }, []);

  /**
   * @param {{ id: number; name: string }} filterSet
   * @param {object} filter
   * @param {boolean} manual
   */
  const renderProjectFilterSet = (filterSet, filter, manual) => (
    <div className='data-request-filter-sets__item' key={filterSet.id}>
      <ExplorerFilterDisplay
        filter={filter}
        title={filterSet.name}
        manual={manual}
      />
      {admin && (
        <Button
          className='data-request-filter-sets__remove'
          buttonType='secondary'
          label='Remove'
          enabled={canRemoveFilterSets}
          onClick={() => setFilterSetToRemove(filterSet)}
        />
      )}
    </div>
  );

  return (
    <div className='data-request-filter-sets'>
      <div className='data-request__form data-request-filter-sets__form'>
        <div className='data-request__header'>
          <h2>Add Filter Set to Request</h2>
        </div>

        <div className='data-request__fields data-request-filter-sets__fields'>
          <FilterSetOpenFormFields
            currentFilterSet={{
              name: '',
              description: '',
              filter: {},
            }}
            fetchWithToken={fetchWithToken}
            filterSets={savedFilterSets?.data || []}
            onActionStateChange={addFilter}
          />
        </div>

        {selectedFiltersetId !== undefined && (
          <Button
            className='data-request__submit data-request-filter-sets__submit'
            label='Add Filter Set to Project'
            onClick={() => submitFilterset(selectedFiltersetId)}
          />
        )}

        {changeFilterSetRequestError.isError && (
          <span className='data-request__request-error'>
            {changeFilterSetRequestError.message}
          </span>
        )}
      </div>
      <div>
        {fetchProjectFilterSetRequestError.isError ? (
          <div className='data-request__request-error'>
            Unable to get the Current Project filter sets
          </div>
        ) : (
          <div className='data-request__form'>
            <div className='data-request__header'>
              <h3>Current Filters:</h3>

              {admin && (
                <Button
                  label={copyFilterAsJson ? 'Close JSON' : 'Open JSON'}
                  onClick={() => setCopyFilterAsJson(!copyFilterAsJson)}
                />
              )}
            </div>
            {admin && copyFilterAsJson && (
              <pre>
                {JSON.stringify(projectFilterSets, null, 2)}
              </pre>
            )}

            <div className='data-request__fields'>
              {projectFilterSets.some(
                (filterSet) => filterSet.filter_object,
              ) && (
                <div className='explorer-filter-set-form'>
                  <h4>Explorer:</h4>
                  {projectFilterSets.map((filterSet) =>
                    filterSet.filter_object
                      ? renderProjectFilterSet(
                          filterSet,
                          filterSet.filter_object,
                          false,
                        )
                      : null,
                  )}
                </div>
              )}

              {projectFilterSets.some(
                (filterSet) =>
                  filterSet.graphql_object &&
                  !filterSet.filter_source_internal_id,
              ) && (
                <div className='explorer-filter-set-form'>
                  <h4>Manual:</h4>
                  {projectFilterSets.map((filterSet) =>
                    filterSet.graphql_object &&
                    typeof filterSet.graphql_object === 'object' &&
                    Object.keys(filterSet.graphql_object).length > 0 &&
                    !filterSet.filter_source_internal_id
                      ? renderProjectFilterSet(
                          filterSet,
                          getFilterState(filterSet.graphql_object),
                          true,
                        )
                      : null,
                  )}
                </div>
              )}
              {projectFilterSets.some(
                (filterSet) =>
                  filterSet.ids_list &&
                  (!filterSet.graphql_object ||
                    (typeof filterSet.graphql_object === 'object' &&
                      Object.keys(filterSet.graphql_object).length === 0)) &&
                  !filterSet.filter_source_internal_id,
              ) && (
                <div className='explorer-filter-set-form'>
                  <h4>Subject Submitter Ids Only Filters:</h4>
                  {projectFilterSets.map((filterSet) =>
                    filterSet.ids_list &&
                    (!filterSet.graphql_object ||
                      (typeof filterSet.graphql_object === 'object' &&
                        Object.keys(filterSet.graphql_object).length === 0)) &&
                    !filterSet.filter_source_internal_id
                      ? renderProjectFilterSet(
                          filterSet,
                          getFilterState({
                            AND: [
                              {
                                IN: {
                                  subject_submitter_id: filterSet.ids_list,
                                },
                              },
                            ],
                          }),
                          true,
                        )
                      : null,
                  )}
                </div>
              )}
              {projectFilterSets.length === 0 && (
                <div className='explorer-filter-set-form'>
                  No filter sets found for this project.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      {filterSetToRemove !== null && (
        <SimplePopup>
          <div className='data-request-filter-sets__confirm'>
            <h3>Remove “{filterSetToRemove.name}” from this project?</h3>
            <p>
              The project's cohort will no longer include this filter set. Any
              consortium request that no remaining filter set covers will be
              deprecated.
            </p>
            <div className='data-request-filter-sets__confirm-actions'>
              <Button
                buttonType='default'
                label='Cancel'
                onClick={() => setFilterSetToRemove(null)}
              />
              <Button
                label='Remove'
                onClick={() => removeFilterset(filterSetToRemove.id)}
              />
            </div>
          </div>
        </SimplePopup>
      )}
    </div>
  );
}
