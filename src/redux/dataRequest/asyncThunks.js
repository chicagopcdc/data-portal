import { createAsyncThunk } from '@reduxjs/toolkit';
import { jobapiPath } from '../../localconf';
import { fetchWithCreds } from '../../utils.fetch';
import {
  isTerminalReExportStatus,
  normalizeReExportStatus,
} from './constants';

const PROJECT_RE_EXPORT_POLL_INTERVAL_MS = 5000;
const projectReExportPollTimeouts = new Map();

function statusCategory(status) {
  return `${Math.floor(status / 100)}XX`;
}

function handleRequestError(status, response, data = null) {
  switch (statusCategory(status)) {
    case '5XX':
      return {
        isError: true,
        message: 'Oops! An issue occurred on our end, please try again',
        data: null,
      };
    case '4XX':
      return {
        isError: true,
        message:
          data ||
          'We were unable to process your request; make sure you have the right permissions',
        data: null,
      };
    default:
      console.error(
        `WARNING: Request failed with status ${response.statusText}`,
      );
      return {
        isError: true,
        message: 'An unknown error occurred',
        data: null,
      };
  }
}

function getRequestErrorMessage(data, fallbackMessage) {
  if (typeof data === 'string' && data) return data;
  if (typeof data?.message === 'string' && data.message) return data.message;
  return fallbackMessage;
}

function getPaginationLinks(linkHeader) {
  if (!linkHeader) {
    return {};
  }
  return linkHeader.split(',').reduce((links, part) => {
    const section = part.split(';');
    if (section.length < 2) {
      return links;
    }
    const url = section[0].replace(/<(.*)>/, '$1').trim();
    const relMatch = section[1].match(/rel="(.*)"/);
    if (!relMatch) {
      return links;
    }
    return {
      ...links,
      [relMatch[1]]: url,
    };
  }, {});
}

function appendList(searchParams, key, values = []) {
  values.forEach((value) => {
    if (value !== null && value !== undefined && value !== '') {
      searchParams.append(key, String(value));
    }
  });
}

export const fetchProjects = createAsyncThunk(
  'dataRequest/fetchProjects',
  /**
   * @param {{
   *   triggerReloading?: boolean,
   *   page?: number,
   *   perPage?: number,
   *   filters?: {
   *     id?: string,
   *     name?: string,
   *     description?: string,
   *     researcherIds?: number[],
   *     statuses?: string[],
   *     consortiums?: string[],
   *     submittedAtStart?: string,
   *     submittedAtEnd?: string,
   *   },
   * }} _
   */
  async (
    {
      triggerReloading = false,
      page = 1,
      perPage = 25,
      filters = {},
    } = {},
    { getState, rejectWithValue },
  ) => {
    const {
      dataRequest: { isAdminActive },
    } = /** @type {import("../types").RootState} */ (getState());

    const searchParams = new URLSearchParams({
      page: String(page),
      per_page: String(perPage),
    });

    if (isAdminActive) {
      searchParams.set('special_user', 'admin');
    }
    if (filters.id) {
      searchParams.set('id', filters.id);
    }
    if (filters.name) {
      searchParams.set('name', filters.name);
    }
    if (filters.description) {
      searchParams.set('description', filters.description);
    }
    if (filters.submittedAtStart) {
      searchParams.set('submitted_at_start', filters.submittedAtStart);
    }
    if (filters.submittedAtEnd) {
      searchParams.set('submitted_at_end', filters.submittedAtEnd);
    }

    appendList(searchParams, 'researcher_id', filters.researcherIds);
    appendList(searchParams, 'status', filters.statuses);
    appendList(searchParams, 'consortiums', filters.consortiums);

    try {
      const { data, response, status, headers } = await fetchWithCreds({
        path: `/amanuensis/projects?${searchParams.toString()}`,
        method: 'GET',
      });

      if (status !== 200) {
        console.error(`WARNING: failed to with status ${response.statusText}`);
        return null;
      }

      return {
        projects: data,
        paginationLinks: getPaginationLinks(
          response?.headers?.get('Link') || headers?.get('Link'),
        ),
      };
    } catch (e) {
      return rejectWithValue(e);
    }
  },
);

export const fetchProjectConsortiums = createAsyncThunk(
  'dataRequest/fetchProjectConsortiums',
  async (_, { getState, rejectWithValue }) => {
    const {
      dataRequest: { projectConsortiums },
    } = /** @type {import("../types").RootState} */ (getState());

    if (projectConsortiums.length > 0) return;

    try {
      const { data, response, status } = await fetchWithCreds({
        path: '/amanuensis/projects/consortiums',
        method: 'GET',
      });

      if (status !== 200) {
        console.error(`WARNING: failed to with status ${response.statusText}`);
        return null;
      }

      return data;
    } catch (e) {
      return rejectWithValue(e);
    }
  },
);

export const fetchProjectStates = createAsyncThunk(
  'dataRequest/fetchProjectStates',
  async (_, { getState, rejectWithValue }) => {
    const {
      dataRequest: { projectStates },
    } = /** @type {import("../types").RootState} */ (getState());

    if (Object.keys(projectStates).length > 0) return;

    try {
      const { data, response, status } = await fetchWithCreds({
        path: '/amanuensis/admin/states',
        method: 'GET',
      });

      if (status !== 200) {
        console.error(`WARNING: failed to with status ${response.statusText}`);
        return null;
      }

      return data;
    } catch (e) {
      return rejectWithValue(e);
    }
  },
);

export const createProject = createAsyncThunk(
  'dataRequest/createProject',
  /** @param {import("./types").CreateParams} createParams */
  async (createParams, { getState, rejectWithValue }) => {
    const createBody = {
      user_id: createParams.user_id,
      name: createParams.name,
      description: createParams.description,
      institution: createParams.institution,
      associated_users_emails: createParams.associated_users_emails,
      filter_set_ids: createParams.filter_set_ids,
    };
    try {
      const { data, response, status } = await fetchWithCreds({
        path: createParams.isAdmin
          ? '/amanuensis/admin/projects'
          : '/amanuensis/projects',
        method: 'POST',
        body: JSON.stringify(createBody),
      });

      if (statusCategory(status) !== '2XX') {
        // Fallback for all other errors
        return handleRequestError(status, response, data);
      }

      const {
        user: { user_id, additional_info },
      } = /** @type {import("../types").RootState} */ (getState());
      const meta = {
        user_id,
        additional_info,
      };

      return { data, meta, isError: false, message: '' };
    } catch (e) {
      return rejectWithValue(e);
    }
  },
);

export const updateProjectState = createAsyncThunk(
  'dataRequest/updateProjectState',
  /** @param {import("./types").ProjectStateUpdateParams} updateParams */
  async (updateParams, { rejectWithValue }) => {
    try {
      const { data, response, status } = await fetchWithCreds({
        path: '/amanuensis/admin/projects/state',
        method: 'POST',
        body: JSON.stringify(updateParams),
      });

      if (statusCategory(status) !== '2XX') {
        return handleRequestError(status, response, data);
      }
      return { data, isError: false, message: '' };
    } catch (e) {
      return rejectWithValue(e);
    }
  },
);

export const updateProjectUsers = createAsyncThunk(
  'dataRequest/updateProjectUsers',
  /** @param {import("./types").ProjectUsersUpdateParams} updateParams */
  async (updateParams, { rejectWithValue }) => {
    try {
      const { data, response, status } = await fetchWithCreds({
        path: '/amanuensis/admin/associated_user',
        method: 'POST',
        body: JSON.stringify(updateParams),
      });

      if (statusCategory(status) !== '2XX') {
        return handleRequestError(status, response, data);
      }
      return { data, isError: false, message: '' };
    } catch (e) {
      return rejectWithValue(e);
    }
  },
);

export const updateProjectApprovedUrl = createAsyncThunk(
  'dataRequest/updateProjectApprovedUrl',
  /** @param {import("./types").ProjectUrlUpdateParams} updateParams */
  async (updateParams, { rejectWithValue }) => {
    try {
      const { data, response, status } = await fetchWithCreds({
        path: '/amanuensis/admin/projects',
        method: 'PUT',
        body: JSON.stringify(updateParams),
      });
      if (statusCategory(status) !== '2XX') {
        return handleRequestError(status, response, data);
      }
      return { data, isError: false, message: '' };
    } catch (e) {
      return rejectWithValue(e);
    }
  },
);

export const exportProjectAgain = createAsyncThunk(
  'dataRequest/exportProjectAgain',
  /** @param {number} projectId */
  async (projectId, { rejectWithValue }) => {
    try {
      const { data, status } = await fetchWithCreds({
        path: `/amanuensis/admin/project/export/${projectId}`,
        method: 'POST',
        customHeaders: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (statusCategory(status) !== '2XX' || !data?.job_uid) {
        return rejectWithValue(
          getRequestErrorMessage(
            data,
            'Failed to start the export job. Please try again.',
          ),
        );
      }

      return data;
    } catch (e) {
      return rejectWithValue(
        e?.message || 'Failed to start the export job. Please try again.',
      );
    }
  },
);

export const checkProjectReExportStatus = createAsyncThunk(
  'dataRequest/checkProjectReExportStatus',
  /** @param {{ projectId: number, jobUid: string }} params */
  async ({ projectId, jobUid }, { rejectWithValue }) => {
    try {
      const { data, status } = await fetchWithCreds({
        path: `${jobapiPath}status?UID=${jobUid}`,
        method: 'GET',
      });

      if (status !== 200 || !data?.status) {
        return rejectWithValue(
          getRequestErrorMessage(
            data,
            'Unable to check the export job status.',
          ),
        );
      }

      return {
        projectId,
        jobUid,
        status: normalizeReExportStatus(data.status),
      };
    } catch (e) {
      return rejectWithValue(
        e?.message || 'Unable to check the export job status.',
      );
    }
  },
);

/** @param {number} projectId */
function clearProjectReExportPoll(projectId) {
  const timeout = projectReExportPollTimeouts.get(projectId);
  if (timeout) window.clearTimeout(timeout);
  projectReExportPollTimeouts.delete(projectId);
}

/**
 * Poll outside the modal lifecycle so closing it does not interrupt the job.
 *
 * @param {{ projectId: number, jobUid: string }} params
 */
export const pollProjectReExportStatus =
  ({ projectId, jobUid }) =>
  async (dispatch) => {
    const action = await dispatch(
      checkProjectReExportStatus({ projectId, jobUid }),
    );

    if (
      checkProjectReExportStatus.fulfilled.match(action) &&
      isTerminalReExportStatus(action.payload.status)
    ) {
      clearProjectReExportPoll(projectId);
      return;
    }

    const timeout = window.setTimeout(
      () => dispatch(pollProjectReExportStatus({ projectId, jobUid })),
      PROJECT_RE_EXPORT_POLL_INTERVAL_MS,
    );
    projectReExportPollTimeouts.set(projectId, timeout);
  };

/** @param {number} projectId */
export const startProjectReExport = (projectId) => async (dispatch) => {
  clearProjectReExportPoll(projectId);
  const action = await dispatch(exportProjectAgain(projectId));

  if (exportProjectAgain.fulfilled.match(action)) {
    await dispatch(
      pollProjectReExportStatus({
        projectId,
        jobUid: action.payload.job_uid,
      }),
    );
  }

  return action;
};

export const updateUserDataAccess = createAsyncThunk(
  'dataRequest/updateUserDataAccess',
  /** @param {import("./types").UserRoleUpdateParams} updateParams */
  async (updateParams, { rejectWithValue }) => {
    try {
      const { data, response, status } = await fetchWithCreds({
        path: '/amanuensis/admin/associated_user_role',
        method: 'PUT',
        body: JSON.stringify(updateParams),
      });

      if (statusCategory(status) !== '2XX') {
        return handleRequestError(status, response, data);
      }
      return { data, isError: false, message: '' };
    } catch (e) {
      return rejectWithValue(e);
    }
  },
);

export const addFiltersetToRequest = createAsyncThunk(
  'dataRequest/addFiltersetToRequest',
  /** @param {import("./types").AddFilterSetIdUpdateParams} updateParams */
  async (updateParams, { rejectWithValue }) => {
    try {
      const { data, response, status } = await fetchWithCreds({
        path: '/amanuensis/admin/copy-search-to-project',
        method: 'POST',
        body: JSON.stringify(updateParams),
      });

      if (statusCategory(status) !== '2XX') {
        return handleRequestError(status, response, data);
      }
      return { data, isError: false, message: '', status: status };
    } catch (e) {
      return rejectWithValue(e);
    }
  },
);

export const deleteRequest = createAsyncThunk(
  'dataRequest/deleteRequest',
  /** @param {import("./types").DeleteRequestParams} deleteParams */
  async (deleteParams, { rejectWithValue }) => {
    try {
      const { data, response, status } = await fetchWithCreds({
        path: '/amanuensis/admin/delete-project',
        method: 'DELETE',
        body: JSON.stringify(deleteParams),
      });
      if (statusCategory(status) !== '2XX') {
        return handleRequestError(status, response, data);
      }
      return { data, isError: false, message: '' };
    } catch (e) {
      return rejectWithValue(e);
    }
  },
);

export const deleteProjectUser = createAsyncThunk(
  'dataRequest/deleteProjectUser',
  /** @param {import("./types").DeleteUserParams} deleteParams */
  async (deleteParams, { rejectWithValue }) => {
    try {
      const { data, response, status } = await fetchWithCreds({
        path: '/amanuensis/admin/remove_associated_user_from_project',
        method: 'DELETE',
        body: JSON.stringify(deleteParams),
      });
      if (statusCategory(status) !== '2XX') {
        return handleRequestError(status, response, data);
      }
      return { data, isError: false, message: '' };
    } catch (e) {
      return rejectWithValue(e);
    }
  },
);

export const getProjectUsers = createAsyncThunk(
  'dataRequest/getProjectUsers',
  /** @param {string} projectId */
  async (projectId, { rejectWithValue }) => {
    try {
      const { data, response, status } = await fetchWithCreds({
        path: `/amanuensis/admin/project_users/${projectId}`,
        method: 'GET',
      });

      if (status !== 200) {
        return handleRequestError(status, response, data);
      }
      return data;
    } catch (e) {
      return rejectWithValue(e);
    }
  },
);

export const getUserRoles = createAsyncThunk(
  'dataRequest/getUserRoles',
  async (_, { rejectWithValue }) => {
    try {
      const { data, response, status } = await fetchWithCreds({
        path: '/amanuensis/admin/all_associated_user_roles',
        method: 'GET',
      });

      if (status !== 200) {
        throw new Error(data || 'Failed to fetch user roles');
      }
      return data;
    } catch (e) {
      return rejectWithValue(e);
    }
  },
);

export const getProjectFilterSets = createAsyncThunk(
  'dataRequest/getProjectFilterSets',
  /** @param {string} projectId */
  async (projectId, { rejectWithValue }) => {
    try {
      const { data, response, status } = await fetchWithCreds({
        path: `/amanuensis/admin/project_filter_sets/${projectId}`,
        method: 'GET',
      });

      if (statusCategory(status) !== '2XX') {
        return handleRequestError(status, response, data);
      }
      return { data, isError: false, message: '', status: status };
    } catch (e) {
      return rejectWithValue(e);
    }
  },
);
