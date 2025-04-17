import { PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import type { ExplorerFilter } from '../../GuppyDataExplorer/types';

type FetchProjectsThunk = createAsyncThunk;

export type CreateParams = {
  isAdmin: boolean;
  user_id: number;
  name: string;
  description: string;
  institution: string;
  associated_users_emails: string[];
  filter_set_ids: number[];
};

export type RequestPayload = {
  data: any;
  meta: any;
  isError: boolean;
  message: string;
};

export type CreatePayload = {
  data: any;
  meta: {
    user_id: number;
    additional_info: WritableDraft<{
      firstName?: string;
      lastName?: string;
      institution?: string;
    }>;
  };
  isError: boolean;
  message: string;
};

export type Request = Promise<PayloadAction<RequestPayload>>;
export type CreateRequest = Promise<PayloadAction<CreatePayload>>;

export type ResearcherInfo = {
  first_name: string;
  id: number;
  institution: string;
  last_name: string;
};

export type DataRequestProject = {
  completed_at: string;
  consortia: string[];
  has_access: boolean;
  id: number;
  name: string;
  researcher: ResearcherInfo;
  status: string;
  submitted_at: string;
};

export type ProjectStateUpdateParams = {
  state_id: number;
  project_id: number;
};

export type ProjectUrlUpdateParams = {
  approved_url: string;
  project_id: number;
};

export type UserRoleUpdateParams = {
  project_id: number;
  email: string;
  role: string;
};

export type AddFilterSetIdUpdateParams = {
  projectId: number;
  filtersetId: number;
};

export type DeleteRequestParams = {
  project_id: number;
};

export type DeleteUserParams = {
  project_id: number;
  email: string;
};

export type ProjectUsersUpdateParams = {
  users: { project_id: number; email: string; id?: number }[];
};

export type ProjectFilterSets = {
  filter_object: ExplorerFilter;
  graphql_object: Dict;
  id: number;
  filter_source_internal_id?: number;
  name: string;
  ids_list: list[string];
};

export type DataRequestState = {
  projects: DataRequestProject[];
  projectStates: Record<string, { id: number; code: string }>;
  userRoles: { id: number; code: string; role: string }[];
  projectUsers: { email: string; role: string }[];
  projectFilterSets: ProjectFilterSets[];
  isError: boolean;
  isAdminActive: boolean;
  isProjectsReloading: boolean;
  isCreatePending: boolean;
  isProjectUsersPending: boolean;
  isUserRolesPending: boolean;
};
