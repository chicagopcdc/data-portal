import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import Table from '../components/tables/base/Table';
import Button from '../gen3-ui-component/components/Button';
import Popup from '../components/Popup';
import AdminProjectActions from './AdminProjectActions';
import VerifyPersonOrEntityUsingCSL from './VerifyPersonOrEntityUsingCSL';
import { useAppSelector } from '../redux/hooks';
import DataDownloadButton from './DataDownloadButton';
import './DataRequests.css';
import Spinner from '../gen3-ui-component/components/Spinner/Spinner';
import Tooltip from 'rc-tooltip';
import 'rc-tooltip/assets/bootstrap_white.css';

/** @typedef {import("../redux/types").RootState} RootState */
/** @typedef {import("../redux/dataRequest/types").ResearcherInfo} ResearcherInfo */
/** @typedef {import("../redux/dataRequest/types").DataRequestProject} DataRequestProject */

const tableHeader = [
  'ID',
  'Research Title',
  'Description',
  'Researcher',
  'Submitted Date',
  'Status',
  'Consortia',
];

/** @param {ResearcherInfo} researcher */
function parseResearcherInfo(researcher) {
  return researcher ? (
    <span>
      {researcher.first_name} {researcher.last_name}
      <br /> ({researcher.institution})
    </span>
  ) : (
    ''
  );
}

/**
 * @param {Object} args
 * @param {DataRequestProject[]} args.projects
 * @param {RootState["user"]["user_id"]} args.userId
 * @param {function} args.rowAction
 * @param {boolean} args.isAdminActive
 */
function parseTableData({ projects, userId, rowAction, isAdminActive }) {
  // projects are coming from props and are readonly. Have to make a shallow copy to sort them
  const copiedProjects = projects ? [...projects] : [];
  return copiedProjects
    .sort((a, b) => {
      const dateA = Date.parse(a.submitted_at);
      const dateB = Date.parse(b.submitted_at);
      if (dateA < dateB) {
        return 1;
      }
      if (dateA > dateB) {
        return -1;
      }
      return 0;
    })
    .map((project) => {
      const descriptionContent =
        project.description && project.description.length > 100 ? (
          <Tooltip
            placement='right'
            arrowContent={<div className='rc-tooltip-arrow-inner' />}
            overlay={<span>{project.description}</span>}
            trigger={['hover', 'focus']}
          >
            <span>{project.description.slice(0, 100) + '…'}</span>
          </Tooltip>
        ) : (
          project.description || ''
        );

      const row = [
        project.id,
        project.name,
        descriptionContent,
        project.researcher?.id === userId
          ? 'Me'
          : parseResearcherInfo(project.researcher),
        new Date(project.submitted_at),
        <span
          className={`data-requests__status-${project.status
            .toLowerCase()
            .replaceAll(' ', '-')}`}
        >
          {project.status}
        </span>,
        project.consortia,
      ];

      if (project.has_access) {
        row.push(<DataDownloadButton project={project} />);
      } else {
        row.push('');
      }

      if (isAdminActive) {
        row.push(
          <button
            type='button'
            className='data-request__table-row-options-trigger'
            aria-label='Table view options'
            onClick={() => rowAction(project)}
          >
            <i className='data-request__table-row-options-trigger-icon' />
          </button>,
        );
      } else {
        row.push('');
      }

      return row;
    });
}

/**
 * @param {Object} props
 * @param {string} [props.className]
 * @param {DataRequestProject[]} props.projects
 * @param {RootState["dataRequest"]["projectStates"]} props.projectStates
 * @param {RootState["explorer"]["savedFilterSets"]} props.savedFilterSets
 * @param {boolean} props.isAdmin
 * @param {boolean} props.isAdminActive
 * @param {function} props.onToggleAdmin
 * @param {boolean} [props.isLoading]
 * @param {function} [props.reloadProjects]
 */
function DataRequestsTable({
  className = '',
  projects,
  projectStates,
  savedFilterSets,
  isAdmin,
  isAdminActive,
  onToggleAdmin,
  isLoading,
  reloadProjects,
}) {
  const transitionTo = useNavigate();
  const userId = useAppSelector((state) => state.user.user_id);
  const [projectDisplayOptions, setProjectDisplayOptions] = useState(null);
  const [isMoreActionsPopupOpen, setMoreActionsPopupOpen] = useState(false);
  const [isVerifyPopupOpen, setVerifyPopupOpen] = useState(false);
  const tableData = useMemo(
    () =>
      parseTableData({
        projects,
        userId,
        rowAction: (project) => {
          setProjectDisplayOptions(project);
        },
        isAdminActive,
      }),
    [projects, userId, isAdminActive],
  );
  let shouldReloadProjectsOnActionClose = false;

  const closeProjectActionPopup = () => {
    if (shouldReloadProjectsOnActionClose) {
      reloadProjects?.();
    }
    setProjectDisplayOptions(null);
  };

  return (
    <div className={className}>
      <div className='data-requests__table-header'>
        <h2>{isAdminActive ? 'All Requests' : 'List of My Requests'}</h2>
        <div className='data-requests__table-actions'>
          <Button
            label={'CSL Verification'}
            enabled={isAdmin}
            onClick={() => setVerifyPopupOpen(true)}
          />
          <Button
            label={'Create Request'}
            enabled={isAdmin}
            onClick={() => transitionTo('/requests/create')}
          />
          <button
            type='button'
            className='data-request__table-view-options-trigger'
            aria-label='Table view options'
            onClick={() => {
              setMoreActionsPopupOpen(true);
            }}
          >
            <i className='data-request__table-view-options-trigger-icon' />
          </button>
        </div>
        {isMoreActionsPopupOpen && (
          <Popup
            title='Requests View Options'
            onClose={() => {
              setMoreActionsPopupOpen(false);
            }}
          >
            <div className='data-requests__more-actions-container'>
              <div className='data-requests__checkbox'>
                <input
                  disabled={!isAdmin}
                  id='data-request-admin-toggle'
                  type='checkbox'
                  checked={isAdminActive}
                  onChange={() => {
                    onToggleAdmin(!isAdminActive);
                  }}
                />
                <label htmlFor='data-request-admin-toggle'>
                  View All (Admin)
                </label>
              </div>
            </div>
          </Popup>
        )}
        {isVerifyPopupOpen && (
          <Popup
            title='Verify Person Or Entity Using The Consolidated Screening List'
            onClose={() => {
              setVerifyPopupOpen(false);
            }}
          >
            <VerifyPersonOrEntityUsingCSL />
          </Popup>
        )}
        {projectDisplayOptions && (
          <Popup
            hideFooter
            title={`Edit "${projectDisplayOptions.name}"`}
            onClose={closeProjectActionPopup}
          >
            <AdminProjectActions
              project={projectDisplayOptions}
              projectStates={projectStates}
              savedFilterSets={savedFilterSets}
              onAction={(type) => {
                if (
                  type === 'PROJECT_STATE' ||
                  type === 'DELETE_REQUEST' ||
                  type === 'SUCCESSFUL_FILTER_SET_CHANGE' ||
                  type === 'SUCCESSFUL_APPROVED_URL_CHANGE'
                ) {
                  shouldReloadProjectsOnActionClose = true;
                }
              }}
              onClose={closeProjectActionPopup}
            />
          </Popup>
        )}
      </div>
      {isLoading ? (
        <Spinner />
      ) : (
        <Table header={tableHeader} data={tableData} />
      )}
    </div>
  );
}

DataRequestsTable.propTypes = {
  className: PropTypes.string,
  projects: PropTypes.array.isRequired,
  projectStates: PropTypes.object.isRequired,
  isAdmin: PropTypes.bool,
  isAdminActive: PropTypes.bool,
  onToggleAdmin: PropTypes.func,
  isLoading: PropTypes.bool,
  reloadProjects: PropTypes.func,
  savedFilterSets: PropTypes.func,
};

export default DataRequestsTable;
