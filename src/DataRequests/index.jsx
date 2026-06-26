import { useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { connect } from 'react-redux';
import { useAppSelector, useAppDispatch } from '../redux/hooks';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { contactEmail } from '../localconf';
import ErrorBoundary from '../components/ErrorBoundary';
import DataRequestsTable from './DataRequestsTable';
import { toggleAdminActive } from '../redux/dataRequest/slice';
import {
  fetchProjects,
  fetchProjectConsortiums,
  fetchProjectStates,
  getUserRoles,
} from '../redux/dataRequest/asyncThunks';
import { adminFetchUsers } from '../redux/user/asyncThunks';
import { fetchFilterSets } from '../redux/explorer/asyncThunks';
import './DataRequests.css';
import { isAdminUser } from '../utils';

/** @typedef {import("../redux/dataRequest/types").DataRequestProject} DataRequestProject */

/** @typedef {import("../redux/types").RootState} RootState */

const emptyFilters = {
  id: '',
  name: '',
  description: '',
  researcherIds: [],
  statuses: [],
  consortiums: [],
  submittedAtStart: '',
  submittedAtEnd: '',
};

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
  const isAdmin = isAdminUser(authz);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [filters, setFilters] = useState(emptyFilters);
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  function getPageFromLink(link) {
    if (!link) {
      return null
    }

    const url = new URL(link, window.location.origin);
    const nextPage = Number(url.searchParams.get('page'));
    return Number.isNaN(nextPage) ? null : nextPage;
  }

  function loadProjects(nextPage, nextPerPage = perPage, nextFilters = filtersRef.current) {
    if (!nextPage) {
      return;
    }

    setPage(nextPage);
    dispatch(
      fetchProjects({
        triggerReloading: true,
        page: nextPage,
        perPage: nextPerPage,
        filters: nextFilters,
      }),
    );
  }

  function changePageSize(nextPerPage) {
    setPerPage(nextPerPage);
    loadProjects(1, nextPerPage);
  }

  function changeFilters(nextFilters) {
    setFilters(nextFilters);
    filtersRef.current = nextFilters;
    loadProjects(1, perPage, nextFilters);
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
            filters={filters}
            onFiltersChange={changeFilters}
            onToggleAdmin={(isActive) => {
              dispatch(toggleAdminActive());
              searchParams.delete('admin');
              if (isActive) {
                dispatch(fetchProjectConsortiums());
                dispatch(fetchProjectStates());
                dispatch(fetchFilterSets());
                dispatch(getUserRoles());
                dispatch(adminFetchUsers());
                setSearchParams(
                  new URLSearchParams([
                    ...Array.from(searchParams.entries()),
                    ['admin', 'true'],
                  ]),
                );
              } else {
                setSearchParams(searchParams);
              }
              const nextFilters = isActive
                ? filtersRef.current
                : {
                    ...filtersRef.current,
                    researcherIds: [],
                  };

              setFilters(nextFilters);
              filtersRef.current = nextFilters;
              loadProjects(1, perPage, nextFilters);
            }}
            reloadProjects={() => {
              loadProjects(page);
            }}
            isAdminActive={isAdminActive}
            isAdmin={isAdmin}
            paginationLinks={paginationLinks}
            page={page}
            perPage={perPage}
            onPageSizeChange={changePageSize}
            onFirstPage={() => loadProjects(getPageFromLink(paginationLinks?.first) || 1)}
            onPreviousPage={() => loadProjects(getPageFromLink(paginationLinks?.prev))}
            onNextPage={() => loadProjects(getPageFromLink(paginationLinks?.next))}
            onLastPage={() => loadProjects(getPageFromLink(paginationLinks?.last))}
            isLoading={isProjectsReloading}
          />
        </ErrorBoundary>
      </main>
    </div>
  );
}

export default connect(mapPropsToState)(DataRequests);
