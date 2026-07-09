import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { connect } from 'react-redux';
import { useAppSelector, useAppDispatch } from '../redux/hooks';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { contactEmail } from '../localconf';
import ErrorBoundary from '../components/ErrorBoundary';
import DataRequestsTable from './DataRequestsTable';
import StatusExplainerModal from './StatusExplainerModal';
import { toggleAdminActive } from '../redux/dataRequest/slice';
import {
  fetchProjects,
  fetchProjectStates,
  getUserRoles,
} from '../redux/dataRequest/asyncThunks';
import { fetchFilterSets } from '../redux/explorer/asyncThunks';
import './DataRequests.css';
import { isAdminUser } from '../utils';

/** @typedef {import("../redux/dataRequest/types").DataRequestProject} DataRequestProject */

/** @typedef {import("../redux/types").RootState} RootState */

/**
 * @param {RootState} state
 */
function mapPropsToState(state) {
  return {
    projects: state.dataRequest.projects,
    projectStates: state.dataRequest.projectStates,
    savedFilterSets: state.explorer.savedFilterSets,
    isProjectsReloading: state.dataRequest.isProjectsReloading,
    isAdminActive: state.dataRequest.isAdminActive,
    paginationLinks: state.dataRequest.paginationLinks,
  };
}

/**
 * @param {Object} [props.paginationLinks]
 * @param {Object} props
 * @param {DataRequestProject[]} [props.projects]
 * @param {RootState["dataRequest"]["projectStates"]} [props.projectStates]
 * @param {RootState["explorer"]["savedFilterSets"]} props.savedFilterSets
 * @param {boolean} [props.isAdminActive]
 * @param {boolean} [props.isProjectsReloading]
 */
function DataRequests({
  projects,
  projectStates,
  savedFilterSets,
  isAdminActive,
  isProjectsReloading,
  paginationLinks,
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const dispatch = useAppDispatch();
  const { authz } = useAppSelector((state) => state.user);
  const dataRequestsConfig = useAppSelector(
    (state) => state.explorer.config.dataRequests,
  );
  const statusFlow = dataRequestsConfig?.statusFlow;
  const isStatusFlowEnabled =
    dataRequestsConfig?.enabled && Boolean(statusFlow);
  const isAdmin = isAdminUser(authz);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [isStatusExplainerOpen, setStatusExplainerOpen] = useState(false);

  function getPageFromLink(link) {
    if (!link) {
      return null;
    }

    const url = new URL(link, window.location.origin);
    const nextPage = Number(url.searchParams.get('page'));
    return Number.isNaN(nextPage) ? null : nextPage;
  }

  function loadProjects(nextPage) {
    if (!nextPage) {
      return;
    }

    setPage(nextPage);
    dispatch(
      fetchProjects({
        triggerReloading: true,
        page: nextPage,
        perPage,
      }),
    );
  }
  function changePageSize(nextPerPage) {
    setPerPage(nextPerPage);
    setPage(1);
    dispatch(
      fetchProjects({
        triggerReloading: true,
        page: 1,
        perPage: nextPerPage,
      }),
    );
  }

  return (
    <div className='data-requests'>
      <header className='data-requests__header'>
        <h1>Data Requests</h1>
      </header>
      <main>
        <ErrorBoundary
          fallback={
            <div className='data-requests__error'>
              <h2>
                <FontAwesomeIcon
                  icon='triangle-exclamation'
                  color='var(--g3-primary-btn__bg-color'
                />{' '}
                Error in fetching your projects...
              </h2>
              <p>
                Please refresh the page. If the problem persists, please contact
                the administrator (
                <a href={`mailto:${contactEmail}`}>{contactEmail}</a>) for more
                information.
              </p>
              <br />
            </div>
          }
        >
          <DataRequestsTable
            className='data-requests__table'
            projects={projects}
            projectStates={projectStates}
            savedFilterSets={savedFilterSets}
            onToggleAdmin={(isActive) => {
              dispatch(toggleAdminActive());
              searchParams.delete('admin');
              if (isActive) {
                dispatch(fetchProjectStates());
                dispatch(fetchFilterSets());
                dispatch(getUserRoles());
                setSearchParams(
                  new URLSearchParams([
                    ...Array.from(searchParams.entries()),
                    ['admin', 'true'],
                  ]),
                );
              } else {
                setSearchParams(searchParams);
              }
              setPage(1);
              dispatch(
                fetchProjects({
                  triggerReloading: true,
                  page: 1,
                  perPage,
                }),
              );
            }}
            reloadProjects={() => {
              dispatch(
                fetchProjects({
                  triggerReloading: true,
                  page,
                  perPage,
                }),
              );
            }}
            isAdminActive={isAdminActive}
            isAdmin={isAdmin}
            paginationLinks={paginationLinks}
            page={page}
            perPage={perPage}
            onPageSizeChange={changePageSize}
            onFirstPage={() =>
              loadProjects(getPageFromLink(paginationLinks?.first) || 1)
            }
            onPreviousPage={() =>
              loadProjects(getPageFromLink(paginationLinks?.prev))
            }
            onNextPage={() =>
              loadProjects(getPageFromLink(paginationLinks?.next))
            }
            onLastPage={() =>
              loadProjects(getPageFromLink(paginationLinks?.last))
            }
            isLoading={isProjectsReloading}
            isStatusFlowEnabled={isStatusFlowEnabled}
            onShowStatusFlow={() => setStatusExplainerOpen(true)}
          />
        </ErrorBoundary>
      </main>
      {isStatusFlowEnabled && (
        <StatusExplainerModal
          isOpen={isStatusExplainerOpen}
          onClose={() => setStatusExplainerOpen(false)}
          statusFlow={statusFlow}
        />
      )}
    </div>
  );
}

export default connect(mapPropsToState)(DataRequests);
