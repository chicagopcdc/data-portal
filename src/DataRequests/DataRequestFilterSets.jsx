import { useCallback, useEffect, useState } from 'react';
import Button from '../gen3-ui-component/components/Button';
import ExplorerFilterDisplay from '../GuppyDataExplorer/ExplorerFilterDisplay';
import '../GuppyDataExplorer/ExplorerFilterSetForms/ExplorerFilterSetForms.css';
import './DataRequestFilterSets.css';
import {
  addFiltersetToRequest,
  getProjectFilterSets,
} from '../redux/dataRequest/asyncThunks';
import { useAppDispatch, useAppSelector } from '../redux/hooks';
import { getFilterState } from '../GuppyComponents/Utils/queries';
import { FilterSetOpenFormFields } from '../GuppyDataExplorer/ExplorerFilterSetForms/FilterSetOpenForm';
import { fetchWithToken } from '../redux/explorer/filterSetsAPI';
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
    const actionRequest =
      /** @type {import("../redux/dataRequest/types").Request} */
      (
        dispatch(
          addFiltersetToRequest({
            filtersetId,
            projectId: projectId,
          }),
        )
      );
    actionRequest.then((action) => {
      if (!action.payload.isError) {
        onAction?.('SUCCESSFUL_FILTER_SET_CHANGE');
        fetchProjectFilterSets(projectId);
      } else {
        setChangeFilterSetRequestError({
          isError: true,
          message: action.payload.message,
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
            label='Change Project Filter Set'
            onClick={() => submitFilterset(selectedFiltersetId)}
          />
        )}

        {changeFilterSetRequestError.isError && (
          <span className='data-request__request-error'>
            Unable to change filter's for this project request.
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
                    filterSet.filter_object ? (
                      <ExplorerFilterDisplay
                        filter={filterSet.filter_object}
                        title={filterSet.name}
                        manual={false}
                      />
                    ) : null,
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
                    !filterSet.filter_source_internal_id ? (
                      <ExplorerFilterDisplay
                        filter={getFilterState(filterSet.graphql_object)}
                        title={filterSet.name}
                        manual={true}
                      />
                    ) : null,
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
                    !filterSet.filter_source_internal_id ? (
                      <ExplorerFilterDisplay
                        filter={getFilterState({
                          AND: [
                            {
                              IN: {
                                subject_submitter_id: filterSet.ids_list,
                              },
                            },
                          ],
                        })}
                        title={filterSet.name}
                        manual={true}
                      />
                    ) : null,
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
    </div>
  );
}
