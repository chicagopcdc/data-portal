import { createSlice } from '@reduxjs/toolkit';
import { FILTER_TYPE } from '../../GuppyComponents/Utils/const';
import { explorerConfig } from '../../localconf';
import {
  createFilterSet,
  deleteFilterSet,
  fetchFilterSets,
  fetchSurvivalConfig,
  updateFilterSet,
  updateSurvivalResult,
} from './asyncThunks';
import {
  checkIfFilterEmpty,
  dereferenceFilter,
  getCurrentConfig,
  initializeWorkspaces,
  parseSurvivalResult,
  updateFilterRefs,
} from './utils';

/**
 * @template T
 * @typedef {import('@reduxjs/toolkit').PayloadAction<T>} PayloadAction
 */
/** @typedef {import('./types').ExplorerFilter} ExplorerFilter */
/** @typedef {import('./types').ExplorerFilterSet} ExplorerFilterSet */
/** @typedef {import('./types').UnsavedExplorerFilterSet} */
/** @typedef {import('./types').ExplorerState} ExplorerState */
/** @typedef {import('./types').ExplorerWorkspace} ExplorerWorkspace */

/** @type {ExplorerState['explorerIds']} */
const explorerIds = [];
for (const { id } of explorerConfig) explorerIds.push(id);
const initialExplorerId = explorerIds[0];
const initialConfig = getCurrentConfig(initialExplorerId);
const initialPatientIds = initialConfig.patientIdsConfig?.filter
  ? []
  : undefined;
const initialWorkspaces = initializeWorkspaces(initialExplorerId);
const initialExplorerFilter = dereferenceFilter(
  initialWorkspaces[initialExplorerId].all[
    initialWorkspaces[initialExplorerId].activeId
  ].filter,
  initialWorkspaces[initialExplorerId]
);

const slice = createSlice({
  name: 'explorer',
  initialState: /** @type {ExplorerState} */ ({
    config: initialConfig,
    explorerFilter: initialExplorerFilter,
    explorerId: initialExplorerId,
    explorerIds,
    patientIds: initialPatientIds,
    savedFilterSets: {
      data: [],
      isError: false,
    },
    survivalAnalysisResult: {
      data: null,
      error: null,
      isPending: false,
      parsed: parseSurvivalResult({
        config: initialConfig.survivalAnalysisConfig,
        result: null,
      }),
      staleFilterSetIds: [],
      usedFilterSetIds: [],
    },
    workspaces: initialWorkspaces,
  }),
  reducers: {
    clearWorkspaceAllFilterSets: {
      prepare: () => ({ payload: crypto.randomUUID() }),
      /** @param {PayloadAction<string>} action */
      reducer: (state, action) => {
        const newActiveId = action.payload;
        /** @type {import('./types').UnsavedExplorerFilterSet} */
        const filterSet = {
          filter: {
            __type: 'STANDARD'
          },
          name: `Filter Tab #1`
        };
        
        state.workspaces[state.explorerId].sessionTabCount = 1;
        state.workspaces[state.explorerId].activeId = newActiveId;
        state.workspaces[state.explorerId].all = { [newActiveId]: filterSet };

        // sync with exploreFilter
        state.explorerFilter = filterSet.filter;
      },
    },
    createWorkspaceFilterSet: {
      prepare: (workspaceId) => ({ payload: workspaceId ?? crypto.randomUUID() }),
      /** @param {PayloadAction<string>} action */
      reducer: (state, action) => {
        state.workspaces[state.explorerId].sessionTabCount += 1;
        const sessionTabCount = state.workspaces[state.explorerId].sessionTabCount;
        const newActiveId = action.payload;
        /** @type {import('./types').UnsavedExplorerFilterSet} */
        const filterSet = {
          filter: {
            __type: 'STANDARD'
          },
          name: `Filter Tab #${sessionTabCount}`
        };
        
        state.workspaces[state.explorerId].activeId = newActiveId;
        state.workspaces[state.explorerId].all[newActiveId] = filterSet;

        // sync with exploreFilter
        state.explorerFilter = filterSet.filter;
      },
    },
    createCombinedWorkspaceFilterSet: {
      prepare: (combineWithId) => ({ payload: { newCreatedId: crypto.randomUUID(), combineWithId }}),
      /** @param {PayloadAction<{ newCreatedId: string, combineWithId: string }>} action */
      reducer: (state, action) => {
        state.workspaces[state.explorerId].sessionTabCount += 1;
        const sessionTabCount = state.workspaces[state.explorerId].sessionTabCount;
        const { newCreatedId, combineWithId } = action.payload;
        const workspace = state.workspaces[state.explorerId];
        const combineWithFilterSet = workspace.all[combineWithId];
        /** @type {import('./types').ExplorerFilterSet} */
        const combinedFilterSet = {
          filter: {
            __type: FILTER_TYPE.COMPOSED,
            __combineMode: /** @type {'AND' | 'OR'} */ ('AND'),
            refIds: combineWithId ? [combineWithId] : [],
            value: combineWithId ? [{
              __type: 'REF',
              value: {
                id: combineWithId,
                label: combineWithFilterSet.name
              }
            }] : [],
          },
          name: `Filter Tab #${sessionTabCount}`
        };

        state.workspaces[state.explorerId].activeId = newCreatedId;
        state.workspaces[state.explorerId].all[newCreatedId] = combinedFilterSet;

        // sync with exploreFilter
        state.explorerFilter = dereferenceFilter(combinedFilterSet.filter, workspace);
      },
    },
    duplicateWorkspaceFilterSet: {
      prepare: (id) => ({ payload: { newId: crypto.randomUUID(), sourceId: id }}),
      /** @param {PayloadAction<{ newId: string, sourceId: string }>} action */
      reducer: (state, action) => {
        state.workspaces[state.explorerId].sessionTabCount += 1;
        
        const sessionTabCount = state.workspaces[state.explorerId].sessionTabCount;
        const newId = action.payload.newId;
        const { activeId } = state.workspaces[state.explorerId];
        const sourceId = action.payload.sourceId ?? activeId;
        const { filter } = state.workspaces[state.explorerId].all[sourceId ?? activeId];
        const filterSet = { filter, name: `Filter Tab #${sessionTabCount}` };

        state.workspaces[state.explorerId].all[newId] = filterSet;
        if (sourceId === activeId) {
          state.workspaces[state.explorerId].activeId = newId;
          // sync with exploreFilter
          const workspace = state.workspaces[state.explorerId];
          state.explorerFilter = dereferenceFilter(filterSet.filter, workspace);
        }
      },
    },
    loadWorkspaceFilterSet: {
      /** @param {ExplorerFilterSet} filterSet */
      prepare: (filterSet) => ({
        payload: { filterSet, newActiveId: crypto.randomUUID() },
      }),
      /**
       * @param {PayloadAction<{
       *  filterSet: ExplorerFilterSet;
       *  newActiveId: string;
       * }>} action
       */
      reducer: (state, action) => {
        const { activeId } = state.workspaces[state.explorerId];
        const activeFilterSet =
          state.workspaces[state.explorerId].all[activeId];
        const shouldOverwrite = checkIfFilterEmpty(activeFilterSet.filter);
        const id = shouldOverwrite ? activeId : action.payload.newActiveId;
        const { filterSet } = action.payload;

        state.workspaces[state.explorerId].activeId = id;
        state.workspaces[state.explorerId].all[id] = filterSet;

        // sync with exploreFilter
        const workspace = state.workspaces[state.explorerId];
        state.explorerFilter = dereferenceFilter(filterSet.filter, workspace);
      },
    },
    removeWorkspaceFilterSet: {
      prepare: (id, newActiveId) => ({ payload: { deleteId: id, newId: crypto.randomUUID(), newActiveId }  }),
      /** @param {PayloadAction<{ newId: string, deleteId: string, newActiveId: string }>} action */
      reducer: (state, action) => {
        const { activeId } = state.workspaces[state.explorerId]
        const { newId, deleteId, newActiveId } = action.payload;

        if (deleteId) {
          delete state.workspaces[state.explorerId].all[deleteId];
        } else {
          delete state.workspaces[state.explorerId].all[activeId];
        }

        const { all } = state.workspaces[state.explorerId];
        const [firstEntry] = Object.entries(all);
        const [id, filterSet] = 
            newActiveId && newActiveId !== deleteId ? [newActiveId, all[newActiveId]] 
          : firstEntry ?? [newId, { filter: {} }];
 
        if (id !== activeId) {
          state.workspaces[state.explorerId].activeId = id;
          state.workspaces[state.explorerId].all[id] = filterSet;
        }

        updateFilterRefs(state.workspaces[state.explorerId]);

        // sync with exploreFilter
        const workspace = state.workspaces[state.explorerId];
        state.explorerFilter = dereferenceFilter(filterSet.filter, workspace);
      },
    },
    updateExplorerFilter: {
      prepare(filter, skipExplorerUpdate = false) {
        return { payload: { filter, skipExplorerUpdate: skipExplorerUpdate  }};
      },
      /** @param {PayloadAction<{ filter: ExplorerState['explorerFilter'], skipExplorerUpdate: boolean }>} action */
      reducer (state, action) {
        const filter = action.payload.filter ?? {};
        const newFilter = {
          /** @type {ExplorerFilter['__combineMode']} */
          __combineMode: 'AND',
          __type: FILTER_TYPE.STANDARD,
          ...filter,
        };

        if (newFilter.__type === FILTER_TYPE.STANDARD) {
          const fields = Object.keys(newFilter.value ?? {});
          if (fields.length > 0) {
            const allSearchFieldSet = new Set();
            for (const { searchFields } of state.config.filterConfig.tabs)
              for (const field of searchFields ?? []) allSearchFieldSet.add(field);
    
            if (allSearchFieldSet.size > 0) {
              /** @type {ExplorerFilter['value']} */
              const filterWithoutSearchFields = {};
              for (const field of fields)
                if (!allSearchFieldSet.has(field))
                  filterWithoutSearchFields[field] = newFilter.value[field];
    
              if (Object.keys(filterWithoutSearchFields).length > 0)
                newFilter.value = filterWithoutSearchFields;
            }
          }
        }

        if (!action.payload.skipExplorerUpdate) {
          // sync with exploreFilter
          const workspace = state.workspaces[state.explorerId];
          state.explorerFilter = dereferenceFilter(newFilter, workspace);
        }

        // sync with workspaces
        const { activeId } = state.workspaces[state.explorerId];
        state.workspaces[state.explorerId].all[activeId].filter = newFilter;
      }
    },
    updateActiveFilterSetName(state, action) {
      const newName = action.payload;
      const activeId = state.workspaces[state.explorerId].activeId;

      state.workspaces[state.explorerId].all[activeId].name = newName;
    },
    /** @param {PayloadAction<ExplorerState['patientIds']>} action */
    updatePatientIds(state, action) {
      if (state.config.patientIdsConfig?.filter !== undefined)
        state.patientIds = action.payload;
    },
    useExplorerById: {
      /** @param {ExplorerState['explorerId']} explorerId */
      prepare: (explorerId) => {
        const activeId = crypto.randomUUID();
        const newWorkspace = {
          activeId,
          all: { [activeId]: { filter: {}, index: 1 }, },
          sessionTabCount: 1
        };
        return { payload: { explorerId, newWorkspace } };
      },
      /**
       * @param {PayloadAction<{
       *  explorerId: ExplorerState['explorerId'];
       *  newWorkspace: ExplorerWorkspace;
       * }>} action
       */
      reducer: (state, action) => {
        const { explorerId } = action.payload;
        state.config = {
          ...getCurrentConfig(explorerId),
          // keep survival config
          survivalAnalysisConfig: state.config.survivalAnalysisConfig,
        };
        state.explorerId = explorerId;

        // sync with workspaces
        let workspace = state.workspaces[explorerId];
        if (workspace === undefined) {
          workspace = action.payload.newWorkspace;
          state.workspaces[explorerId] = workspace;
        }

        // sync with explorerFilter
        const { filter } = workspace.all[workspace.activeId];
        state.explorerFilter = dereferenceFilter(filter, workspace);
      },
    },
    /** @param {PayloadAction<string>} action */
    useWorkspaceFilterSet(state, action) {
      const newActiveId = action.payload;
      const { explorerId } = state;
      state.workspaces[explorerId].activeId = newActiveId;

      // sync with exploreFilter
      const workspace = state.workspaces[explorerId];
      const { filter } = workspace.all[newActiveId];
      state.explorerFilter = dereferenceFilter(filter, workspace);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(createFilterSet.fulfilled, (state, action) => {
        const filterSet = action.payload;
        const { activeId } = state.workspaces[state.explorerId];

        state.savedFilterSets.data.push(filterSet);
        
        // sync with workspaces
        state.workspaces[state.explorerId].all[activeId] = filterSet;
      })
      .addCase(createFilterSet.rejected, (state) => {
        state.savedFilterSets.isError = true;
      })
      .addCase(deleteFilterSet.fulfilled, (state, action) => {
        const index = state.savedFilterSets.data.findIndex(
          ({ id }) => id === action.payload
        );
        if (index !== undefined) state.savedFilterSets.data.splice(index, 1);
      })
      .addCase(deleteFilterSet.rejected, (state) => {
        state.savedFilterSets.isError = true;
      })
      .addCase(fetchFilterSets.fulfilled, (state, action) => {
        state.savedFilterSets.data = action.payload;
      })
      .addCase(fetchFilterSets.pending, (state) => {
        state.savedFilterSets.isError = false;
      })
      .addCase(fetchFilterSets.rejected, (state) => {
        state.savedFilterSets.isError = true;
      })
      .addCase(updateFilterSet.fulfilled, (state, action) => {
        const filterSet = action.payload;
        const index = state.savedFilterSets.data.findIndex(
          ({ id }) => id === filterSet.id
        );
        const { activeId } = state.workspaces[state.explorerId];

        state.savedFilterSets.data[index] = filterSet;

        // sync with workspaces
        state.workspaces[state.explorerId].all[activeId] = filterSet;

        // sync with survival result
        const { id } = filterSet;
        if (state.survivalAnalysisResult.usedFilterSetIds.includes(id))
          state.survivalAnalysisResult.staleFilterSetIds.push(id);
      })
      .addCase(updateFilterSet.rejected, (state) => {
        state.savedFilterSets.isError = true;
      })
      .addCase(updateSurvivalResult.fulfilled, (state, action) => {
        const { data, usedFilterSetIds } = action.payload;
        state.survivalAnalysisResult.data = data;
        state.survivalAnalysisResult.isPending = false;
        state.survivalAnalysisResult.parsed = parseSurvivalResult({
          config: state.config.survivalAnalysisConfig,
          result: data,
        });
        state.survivalAnalysisResult.staleFilterSetIds = [];
        state.survivalAnalysisResult.usedFilterSetIds = usedFilterSetIds;
      })
      .addCase(updateSurvivalResult.pending, (state) => {
        state.survivalAnalysisResult.error = null;
        state.survivalAnalysisResult.isPending = true;
      })
      .addCase(updateSurvivalResult.rejected, (state, action) => {
        state.survivalAnalysisResult.data = null;
        state.survivalAnalysisResult.error = action.error;
        state.survivalAnalysisResult.isPending = false;
        state.survivalAnalysisResult.parsed = {};
        state.survivalAnalysisResult.staleFilterSetIds = [];
        state.survivalAnalysisResult.usedFilterSetIds = [];
      })
      .addCase(fetchSurvivalConfig.fulfilled, (state, action) => {
        const config = action.payload;
        if (config === undefined) return;

        state.config.survivalAnalysisConfig = config;
        state.survivalAnalysisResult.parsed = parseSurvivalResult({
          config,
          result: null,
        });
      });
  },
});

export const {
  createCombinedWorkspaceFilterSet,
  clearWorkspaceAllFilterSets,
  createWorkspaceFilterSet,
  duplicateWorkspaceFilterSet,
  loadWorkspaceFilterSet,
  removeWorkspaceFilterSet,
  updateExplorerFilter,
  updatePatientIds,
  useExplorerById,
  useWorkspaceFilterSet,
  updateActiveFilterSetName,
} = slice.actions;

export default slice.reducer;
