import { createSlice } from '@reduxjs/toolkit';
import {
  fetchProjects,
  createProject,
  fetchProjectStates,
  fetchProjectConsortiums,
  getProjectUsers,
  getUserRoles,
  exportProjectAgain,
  checkProjectReExportStatus,
} from './asyncThunks';
import { RE_EXPORT_STATUS } from './constants';

const slice = createSlice({
  name: 'dataRequest',
  initialState: /** @type {import("./types").DataRequestState} */ ({
    projects: [],
    userRoles: [],
    projectStates: {},
    projectConsortiums: [],
    paginationLinks: {},
    reExportJobs: {},
    isError: false,
    isAdminActive: false,
    isProjectsReloading: false,
    isCreatePending: false,
    isUserRolesPending: false,
    userRolesError: false,
  }),
  reducers: {
    toggleAdminActive(state) {
      state.isAdminActive = !state.isAdminActive;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchProjects.pending, (state, action) => {
      if (action.meta.arg.triggerReloading) {
        state.isProjectsReloading = true;
      }
    });
    builder.addCase(fetchProjects.fulfilled, (state, action) => {
      state.isProjectsReloading = false;
      if (action.payload === null) return;

      state.projects = action.payload.projects;
      state.paginationLinks = action.payload.paginationLinks;
    });
    builder.addCase(fetchProjects.rejected, (state) => {
      state.isProjectsReloading = false;
      state.isError = true;
    });
    builder.addCase(fetchProjectStates.fulfilled, (state, action) => {
      if (
        action.payload === null ||
        Object.keys(state.projectStates).length > 0
      )
        return;

      const { projectStates } = state;

      for (const projectState of action.payload) {
        state.projectStates[projectState.name] = {
          id: projectState.id,
          code: projectState.code,
        };
      }

      state.projectStates = projectStates;
    });
    builder.addCase(fetchProjectConsortiums.fulfilled, (state, action) => {
      if (action.payload) {
        state.projectConsortiums = action.payload;
      }
    });
    builder.addCase(createProject.pending, (state) => {
      state.isCreatePending = true;
    });
    builder.addCase(createProject.fulfilled, (state, action) => {
      state.isCreatePending = false;

      // Check if asyncThunk passed null or error payload
      if (!action.payload || action.payload.isError) {
        return;
      }

      const {
        meta: {
          user_id: currentUserId,
          additional_info: { firstName, lastName, institution },
        },
        data: { id, name, description, create_date: submitted_at },
      } = action.payload;

      const newProject = {
        completed_at: '',
        has_access: false,
        id,
        name,
        description,
        approved_url_present: false,
        researcher: {
          first_name: firstName,
          last_name: lastName,
          institution,
          id: currentUserId,
        },
        /** @type {"In Review"} */
        status: 'In Review',
        submitted_at,
        consortia: [],
      };

      state.projects = [newProject, ...state.projects];
    });
    builder.addCase(createProject.rejected, (state) => {
      state.isCreatePending = false;
      state.isError = true;
    });
    builder.addCase(getUserRoles.pending, (state) => {
      state.isUserRolesPending = true;
      state.userRolesError = false;
    });
    builder.addCase(getUserRoles.rejected, (state) => {
      state.userRoles = [];
      state.isUserRolesPending = false;
      state.userRolesError = true;
    });
    builder.addCase(getUserRoles.fulfilled, (state, action) => {
      state.isUserRolesPending = false;
      if (action.payload) {
        state.userRoles = action.payload;
      }
    });
    builder.addCase(exportProjectAgain.pending, (state, action) => {
      state.reExportJobs[action.meta.arg] = {
        status: RE_EXPORT_STATUS.DISPATCHING,
        error: null,
      };
    });
    builder.addCase(exportProjectAgain.fulfilled, (state, action) => {
      state.reExportJobs[action.meta.arg] = {
        ...action.payload,
        status: RE_EXPORT_STATUS.RUNNING,
        error: null,
      };
    });
    builder.addCase(exportProjectAgain.rejected, (state, action) => {
      state.reExportJobs[action.meta.arg] = {
        status: RE_EXPORT_STATUS.FAILED,
        error: action.payload || action.error.message,
      };
    });
    builder.addCase(checkProjectReExportStatus.fulfilled, (state, action) => {
      const { projectId, jobUid, status } = action.payload;
      const currentJob = state.reExportJobs[projectId];
      if (currentJob?.job_uid !== jobUid) return;

      currentJob.status = status;
      currentJob.error =
        status === RE_EXPORT_STATUS.FAILED ? 'The export job failed.' : null;
    });
    builder.addCase(checkProjectReExportStatus.rejected, (state, action) => {
      const { projectId, jobUid } = action.meta.arg;
      const currentJob = state.reExportJobs[projectId];
      if (currentJob?.job_uid !== jobUid) return;

      currentJob.error = action.payload || action.error.message;
    });
  },
});

export const { toggleAdminActive } = slice.actions;
export default slice.reducer;
