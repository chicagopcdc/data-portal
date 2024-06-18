import { useEffect, useRef, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { contactEmail, explorerConfig } from '../localconf';
import ErrorBoundary from '../components/ErrorBoundary';
import Dashboard from '../Layout/Dashboard';
import GuppyWrapper from '../GuppyComponents/GuppyWrapper';
import NotFoundSVG from '../img/not-found.svg';
import { fetchFilterSets } from '../redux/explorer/asyncThunks';
import { updateExplorerFilter, useExplorerById } from '../redux/explorer/slice';
import { useAppDispatch, useAppSelector } from '../redux/hooks';
import ExplorerSelect from './ExplorerSelect';
import ExplorerVisualization from './ExplorerVisualization';
import './Explorer.css';
import { useStore } from 'react-redux';
import { getDictionaryVersion } from '../DataDictionary/utils';
import SimplePopup from '../components/SimplePopup';
import Tooltip from 'rc-tooltip';
import {
  createFilterSet,
  deleteFilterSet,
  updateFilterSet,
} from '../redux/explorer/asyncThunks';
import {
  createToken,
  fetchWithToken,
} from '../redux/explorer/filterSetsAPI';
import FilterSetActionForm from './ExplorerFilterSetWorkspace/FilterSetActionForm';
import FilterSetLabel from './ExplorerFilterSetWorkspace/FilterSetLabel';
import useFilterSetWorkspace from './ExplorerFilterSetWorkspace/useFilterSetWorkspace';
import {
  dereferenceFilter,
  FILTER_TYPE,
} from './ExplorerFilterSetWorkspace/utils';
import { getExpandedStatus } from '../gen3-ui-component/components/filters/FilterGroup/utils';
import './ExplorerFilterSetWorkspace/ExplorerFilterSetWorkspace.css';
import ExplorerFilter, { CombinedExplorerFilter } from './ExplorerFilter';
import {
  Tabs,
  TabList,
  Tab,
  TabPanel,
  Button,
  Menu,
  MenuItem,
  MenuTrigger,
  Popover,
  Toolbar,
  Group,
  Dialog,
  DialogTrigger
} from 'react-aria-components';
import {
  mergeFilters,
} from '../GuppyComponents/Utils/filters';

/** @typedef {import('../redux/types').RootState} RootState */
/** @typedef {import('./types').OptionFilter} OptionFilter */
/** @typedef {import('./types').FilterChangeHandler} FilterChangeHandler */
/** @typedef {import('../redux/types').RootStore} RootStore */
/** @typedef {import('./types').SavedExplorerFilterSet} SavedExplorerFilterSet */
/** @typedef {import('./ExplorerFilterSetWorkspace/FilterSetActionForm').ActionFormType} ActionFormType */
/** @typedef {import('./types').ExplorerFilterSet} ExplorerFilterSet */
/** @typedef {import('./types').UnsavedExplorerFilterSet} UnsavedExplorerFilterSet */

function hasCombinedWithCurrent(currentId, workspace) {
  // if any composed filter set contains a reference to the active filter set
  // being removed we need to delete the composed filter set as well, since
  // that reference will no longer exist, which will cause errors
  const composedWithActive = Object.keys(workspace.all).filter((id) => {
    /** @type {ExplorerFilterSet} */
    let filterSet = workspace.all[id];
    if (filterSet.filter.__type === 'COMPOSED') {
      /** @type {UnsavedExplorerFilterSet['filter']} */
      let filter = filterSet.filter;
      if (filter.refIds?.some((refId) => refId === currentId)) {
        return true;
      }
    }
    return false;
  });
  return composedWithActive.length > 0;
}

/** @type {{ [x: string]: OptionFilter }} */
const emptyAdminAppliedPreFilters = {};

function ExplorerDashboard() {
  /** @type {RootStore} */
  const reduxStore = useStore();
  const dispatch = useAppDispatch();
  const {
    config: {
      adminAppliedPreFilters = emptyAdminAppliedPreFilters,
      chartConfig,
      filterConfig,
      guppyConfig,
      tableConfig,
    },
    explorerFilter,
    explorerId,
    explorerIds,
    patientIds,
  } = useAppSelector((state) => state.explorer);
  const { dataVersion, portalVersion, survivalCurveVersion } = useAppSelector(
    (state) => state.versionInfo,
  );
  const [searchParams, setSearchParams] = useSearchParams();
  const searchParamId = useRef(undefined);
  let isInitialQuery = true;
  // const [showVersionInfo, setShowVersionInfo] = useState(false);

  const isSearchParamIdValid =
    searchParams.has('id') &&
    explorerIds.includes(Number(searchParams.get('id')));
  searchParamId.current = isSearchParamIdValid
    ? Number(searchParams.get('id'))
    : explorerIds[0];
  const dict = reduxStore.getState().submission.dictionary;
  const dictSections = dict ? Object.entries(dict) : [];

  const dictionaryEntries = [];
  for (let [sectionKey, sectionValue] of dictSections) {
    if (
      sectionKey &&
      !sectionKey.startsWith('_') &&
      sectionValue?.hasOwnProperty('properties')
    ) {
      const dictEntries = Object.entries(sectionValue.properties);
      for (let [entryKey, entryValue] of dictEntries) {
        dictionaryEntries.push({ sectionKey, entryKey, entryValue });
      }
    }
  }
  const dictionaryVersion = getDictionaryVersion();
  const savedFilterSets = useAppSelector(
    (state) => state.explorer.savedFilterSets
  );
  const workspace = useFilterSetWorkspace();
  const activeFilterSet = workspace.all[workspace.activeId];
  const activeSavedFilterSet = savedFilterSets.data.find(
    ({ id }) => id === activeFilterSet.id
  );
  const all = workspace.all;
  const workspaceTabIds = Object.keys(all);
  const filterCount = Object.values(all).length;
  const lastActiveTabId = useRef(workspace.activeId);
  const filterTabs = filterConfig.tabs.map(
    ({ title, fields, searchFields }) => ({
      title,
      // If there are any search fields, insert them at the top of each tab's fields.
      fields: searchFields ? searchFields.concat(fields) : fields,
    })
  );
  const initialWorkspaceUIState = {};
  for (let workspaceId of Object.keys(all)) {
    initialWorkspaceUIState[workspaceId] = {
      expandedStatus: getExpandedStatus(filterTabs, false),
      tabIndex: 0
    }
  }
  const workspaceUIState = useRef(initialWorkspaceUIState);
  const [actionFormType, setActionFormType] = useState(
    /** @type {ActionFormType} */ (undefined)
  );

  /** @type {FilterChangeHandler} */
  const handleFilterChange = useCallback((filter, skipExplorerUpdate) => {
    dispatch(updateExplorerFilter(mergeFilters(filter, adminAppliedPreFilters), skipExplorerUpdate));
  }, []);
  const closeActionForm = useCallback(() => {
    setActionFormType(undefined);
  }, []);
  const handleClearAll = useCallback(() => {
    const { payload: resetFilterSetId } = workspace.clearAll();
    const resetWorkspaceUIState = {
      [resetFilterSetId]: {
        expandedStatus: getExpandedStatus(filterTabs, false),
        tabIndex: 0
      }
    };
    workspaceUIState.current = resetWorkspaceUIState;
    closeActionForm();
  }, []);
  const handleCreate = useCallback(() => {
    const newWorkspaceId = crypto.randomUUID();
    workspaceUIState.current[newWorkspaceId] = {
      expandedStatus: getExpandedStatus(filterTabs, false),
      tabIndex: 0
    }
    workspace.create(newWorkspaceId);
  }, []);
  const handleDuplicate = useCallback((sourceId) => {
    const newWorkspaceId = crypto.randomUUID();
    workspaceUIState.current[newWorkspaceId] = {
      expandedStatus: getExpandedStatus(filterTabs, false),
      tabIndex: 0
    }
    workspace.duplicate(sourceId, newWorkspaceId);
  }, []);
  /** @param {SavedExplorerFilterSet} deleted */
  const handleDelete = useCallback(async (deleted) => {
    try {
      let workspaceId;
      for (const [id, filterSet] of Object.entries(workspace.all)) {
        if (filterSet.id === deleted.id) {
          workspaceId = id;
          break;
        }
      }
      await dispatch(deleteFilterSet(deleted));
      workspace.remove(workspaceId);
    } finally {
      closeActionForm();
    }
  }, [workspace]);

  /**
   * @param {SavedExplorerFilterSet} loaded
   * @param {boolean} [isShared]
   */
  const handleLoad = useCallback((loaded, isShared = false) => {
    const newWorkspaceId = crypto.randomUUID();
    if (isShared) {
      workspace.load(loaded, newWorkspaceId);
      workspaceUIState.current[newWorkspaceId] = {
        expandedStatus: getExpandedStatus(filterTabs, false),
        tabIndex: 0
      }
    } else {
      let existingActiveId;

      for (const [id, filterSet] of Object.entries(workspace.all)) {
        if (filterSet.id === loaded.id) {
          existingActiveId = id;
          break;
        }
      }

      const nextActiveId = existingActiveId ?? newWorkspaceId;

      workspace.load(loaded, nextActiveId);
      workspaceUIState.current[nextActiveId] = {
        expandedStatus: getExpandedStatus(filterTabs, false),
        tabIndex: 0
      }
    }

    closeActionForm();
  }, [workspace]);
  /** @param {SavedExplorerFilterSet} saved */
  const handleSave = useCallback(async (saved) => {
    try {
      if (saved.id === undefined) { 
        await dispatch(createFilterSet(saved));

      } else {
        await dispatch(updateFilterSet(saved));
      }
    } finally {
      closeActionForm();
    }
  }, []);
  const handleShare = useCallback((savedFilterSet) => {
    return createToken(savedFilterSet);
  }, []);
  const handleRemove = useCallback((id, newActiveId) => {
    workspace.remove(id, newActiveId);
  }, []);
    /** @param {ExplorerFilterSet} renamedFilterSet */
  const handleRename = useCallback((renamedFilterSet) => {
    workspace.rename(renamedFilterSet.name);
    closeActionForm();
  }, []);

  /** @param {string} id */
  const handleCombineWith = useCallback((id) => {
    workspace.createCombine(id);
  }, []);


  useEffect(() => {
    // sync saved filter sets with explorer id state
    dispatch(fetchFilterSets()).unwrap().catch(console.error);
  }, [explorerId]);

  
  useEffect(() => {
    isInitialQuery = false;
    // sync search param with explorer id state
    setSearchParams(`id=${searchParamId.current}`, { replace: true });
    if (explorerId !== searchParamId.current)
      dispatch(useExplorerById(searchParamId.current));

    function switchExplorerOnBrowserNavigation() {
      if (explorerIds.includes(searchParamId.current))
        dispatch(useExplorerById(searchParamId.current));
    }

    window.addEventListener('popstate', switchExplorerOnBrowserNavigation);
    return () =>
      window.removeEventListener('popstate', switchExplorerOnBrowserNavigation);
  }, []);

  return <>
    <ExplorerSelect />
    <div className='explorer-filter-set-workspace'>
      <Toolbar aria-label="Tab list actions">
        <Group className='explorer-action-group explorer-action-group__new-tab'>
          <Button
            onPress={handleCreate}
          >
            <i className='g3-icon g3-icon--plus g3-icon-color__black g3-icon--sm' /> New Tab
          </Button>
        </Group>
        <Group className='explorer-action-group explorer-action-group__more'>
          <MenuTrigger>
              <Button aria-label="Tab action menu">
                <i className='g3-icon g3-icon--more g3-icon-color__black g3-icon--md' />
              </Button>
              <Popover offset={0}>
                <Menu onAction={action => {
                  switch(action) {
                    case 'LOAD':
                    case 'CLEAR-ALL':
                      setActionFormType(action);
                  }
                }}>
                  <MenuItem id="LOAD">Load saved</MenuItem>
                  <MenuItem id="CLEAR-ALL">Remove all</MenuItem>
                </Menu>
              </Popover>
            </MenuTrigger>
        </Group>
      </Toolbar>
      <Tabs
        orientation='vertical'
        keyboardActivation='manual'
        selectedKey={workspace.activeId}
        onSelectionChange={(/** @type {string}*/ requestedSelectionId) => {
          if (
            requestedSelectionId !== workspace.activeId && 
            workspace.activeId === lastActiveTabId.current
          ) {
            workspace.use(requestedSelectionId);
            lastActiveTabId.current = requestedSelectionId;
          } else {
            lastActiveTabId.current = workspace.activeId;
          }
        }}
      >
        <TabList>
          {workspaceTabIds.map((workspaceId, i) => {
            const filterSet = workspace.all[workspaceId];

            return <Tab id={workspaceId} key={workspaceId}>
              <div className='explorer-filter-set-workspace__tab-title'>
                <FilterSetLabel filterSet={filterSet} hasTooltip={false} titleTag='h4' />
              </div>
            </Tab>;
          })}
        </TabList>
        {workspaceTabIds.map((workspaceId, i) => {
            const filterSet = workspace.all[workspaceId];
            const savedFilterSet = savedFilterSets.data.find(({ id }) => id === filterSet.id);
            const handleAction = (action) => {
              switch (action) {
                case 'COMBINE':
                  handleCombineWith(workspaceId);
                  return;
                case 'DUPLICATE':
                  handleDuplicate(workspaceId);
                  return;
                case 'REVERT':
                  handleFilterChange(savedFilterSet.filter);
                  return;
                case 'RESET':
                  const composedResetFilter = {
                    __type: FILTER_TYPE.COMPOSED,
                    __combineMode: /** @type {'AND' | 'OR'} */ ('AND'),
                    refIds: [],
                    value: [],
                  };
                  handleFilterChange(filterSet.filter.__type === 'COMPOSED' ? composedResetFilter : undefined);
                  return;
                case 'RENAME':
                case 'SHARE':
                case 'DELETE':
                case 'SAVE':
                  setActionFormType(action);
                  return;
              }
            };
            const disabledActions = [];

            if (savedFilterSet === undefined) {
              disabledActions.push('REVERT', 'UNSAVE', 'SHARE');
            } else if (JSON.stringify(savedFilterSet.filter) === JSON.stringify(filterSet.filter)) {
              disabledActions.push('REVERT');
            }
            
            return <TabPanel id={workspaceId} key={workspaceId}>
              <GuppyWrapper
                key={explorerId}
                adminAppliedPreFilters={adminAppliedPreFilters}
                explorerFilter={explorerFilter}
                chartConfig={chartConfig}
                filterConfig={filterConfig}
                guppyConfig={guppyConfig}
                rawDataFields={tableConfig.fields}
                patientIds={patientIds}
                isInitialQuery={isInitialQuery}
              >
                {(data) => {
                  return <Dashboard>
                    <Dashboard.Sidebar className='explorer__sidebar'>
                      <div>
                        <div className='explorer-filter-set-workspace___filter-actions'>
                          <Tooltip
                            arrowContent={<div className='rc-tooltip-arrow-inner' />}
                            overlay={hasCombinedWithCurrent(workspaceId, workspace) ?
                              'To remove the currently active filter set from the workspace, first remove it from any unsaved composed filter set in the workspace' :
                              'Remove the currently active filter set from the workspace'
                            }
                            placement='bottom'
                            trigger={filterCount <= 1 ? [] : ['hover', 'focus']}
                          >
                            <button
                              className={`explorer-filter-set-workspace___close-filter-action ${filterCount <= 1  ? 'hidden' : 'visible'}`}
                              type='button'
                              disabled={hasCombinedWithCurrent(workspaceId, workspace)}
                              onClick={() => {
                                if (hasCombinedWithCurrent(workspaceId, workspace)) {
                                  return;
                                }
                                let nextActiveId = workspaceTabIds.at(i-1);
                                handleRemove(workspaceId, nextActiveId);
                                lastActiveTabId.current = nextActiveId;
                              }}
                            >
                              <i className='g3-icon g3-icon--cross g3-icon-color__black g3-icon--sm' />
                            </button>
                          </Tooltip>
                          <MenuTrigger>
                            <Button className='react-aria-Button explorer-filter-set-workspace___more-filter-actions' aria-label="Tab action menu">
                              <i className='g3-icon g3-icon--more g3-icon-color__black g3-icon--sm' />
                            </Button>
                            <Popover offset={0}>
                              {
                                filterSet.filter.__type === 'STANDARD' ?
                                    <Menu
                                      disabledKeys={disabledActions}
                                      onAction={handleAction}
                                    >
                                        <MenuItem id="RENAME">Rename</MenuItem>
                                        <MenuItem id="RESET">Reset</MenuItem>
                                        <MenuItem id="DUPLICATE">Duplicate</MenuItem>
                                        <MenuItem id="COMBINE">Combine with...</MenuItem>
                                        <MenuItem id="SAVE">{savedFilterSet ? 'Update saved' : 'Save'}</MenuItem>
                                        <MenuItem id="DELETE">Unsave and remove</MenuItem>
                                        <MenuItem id="REVERT">Revert to saved</MenuItem>       
                                        <MenuItem id="SHARE">Share</MenuItem>              
                                    </Menu>
                                  : <Menu
                                      disabledKeys={disabledActions}
                                      onAction={handleAction}
                                    >
                                      <MenuItem id="RENAME">Rename</MenuItem>
                                      <MenuItem id="RESET">Reset</MenuItem>
                                      <MenuItem id="DUPLICATE">Duplicate</MenuItem>
                                    </Menu>
                              }
                            </Popover>
                          </MenuTrigger>
                        </div>
                          { filterSet.filter.__type === FILTER_TYPE.COMPOSED ? (
                            <CombinedExplorerFilter
                              workspace={workspace}
                              title={filterSet.name}
                              combinedFilter={filterSet.filter}
                              onFilterChange={handleFilterChange}
                              className='explorer__filter explorer__combined-filter'
                            />
                          ) : (
                            <ExplorerFilter
                              title={filterSet.name}
                              anchorValue={data.anchorValue}
                              className='explorer__filter'
                              filter={filterSet.filter}
                              initialTabsOptions={data.initialTabsOptions}
                              onAnchorValueChange={data.onAnchorValueChange}
                              onFilterChange={handleFilterChange}
                              tabsOptions={data.tabsOptions}
                              dictionaryEntries={dictionaryEntries}
                              filterUIState={workspaceUIState.current[workspaceId]}
                            />
                          )}
                      </div>
                    </Dashboard.Sidebar>
                    <Dashboard.Main className='explorer__main'>
                      <ExplorerVisualization
                        accessibleCount={data.accessibleCount}
                        aggsChartData={data.aggsChartData}
                        allFields={data.allFields}
                        filter={data.filter}
                        isLoadingAggsData={data.isLoadingAggsData}
                        isLoadingRawData={data.isLoadingRawData}
                        rawData={data.rawData}
                        totalCount={data.totalCount}
                        downloadRawData={data.downloadRawData}
                        downloadRawDataByFields={data.downloadRawDataByFields}
                        downloadRawDataByTypeAndFilter={
                          data.downloadRawDataByTypeAndFilter
                        }
                        fetchAndUpdateRawData={data.fetchAndUpdateRawData}
                        getTotalCountsByTypeAndFilter={
                          data.getTotalCountsByTypeAndFilter
                        }
                      />
                    </Dashboard.Main>
                </Dashboard>
              }}
            </GuppyWrapper>
          </TabPanel>;
        })}
      </Tabs>
      <div className='explorer__side-bar-footer'>
        <div className='explorer__version-info-area'>
          <div className='explorer__version-info'>
            <span>Help:</span>{' '}
            <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
            <DialogTrigger>
              <Button
                type='button'
                className='explorer__version-info-text-button separator-before'
              >
                View app version info
              </Button>
              <Popover>
                <Dialog>
                  <div className='explorer-filter__query-container explorer-filter__query-container--expanded'>
                    {dataVersion && (
                      <div className='explorer__version-info'>
                        <span>Data Release Version:</span> {dataVersion}
                      </div>
                    )}
                    {portalVersion && (
                      <div className='explorer__version-info'>
                        <span>Portal Version:</span> {portalVersion}
                      </div>
                    )}
                    {dictionaryVersion && (
                      <div className='footer__version-info'>
                        <span>Dictionary Version:</span> {dictionaryVersion}
                      </div>
                    )}
                    {survivalCurveVersion && (
                      <div className='explorer__version-info'>
                        <span>Survival Curve Version:</span> {survivalCurveVersion}
                      </div>
                    )}
                  </div>
                </Dialog>
              </Popover>
            </DialogTrigger>
          </div>             
        </div>
      </div>
      {actionFormType !== undefined && (
        <SimplePopup>
          <FilterSetActionForm
            currentFilter={
              dereferenceFilter(activeFilterSet?.filter, workspace) ?? {}
            }
            filterSets={{
              active: actionFormType === 'RENAME' ?  activeFilterSet : activeSavedFilterSet,
              all: actionFormType === 'RENAME' ? Object.values(workspace.all) : savedFilterSets.data,
              empty: { name: '', description: '', filter: {} },
            }}
            fetchWithToken={fetchWithToken}
            handlers={{
              clearAll: handleClearAll,
              close: closeActionForm,
              delete: handleDelete,
              load: handleLoad,
              save: handleSave,
              share: handleShare,
              rename: handleRename
            }}
            type={actionFormType}
          />
        </SimplePopup>
      )}
    </div>
  </>;
}

const fallbackElement = (
  <div className='explorer__error'>
    <h1>Error opening the Exploration page...</h1>
    <p>
      The Exploration page is not working correctly. Please try refreshing the
      page. If the problem continues, please contact the administrator (
      <a href={`mailto:${contactEmail}`}>{contactEmail}</a>) for more
      information.
    </p>
    <NotFoundSVG />
  </div>
);

export default function Explorer() {
  return explorerConfig.length === 0 ? null : (
    <ErrorBoundary fallback={fallbackElement}>
      <ExplorerDashboard />
    </ErrorBoundary>
  );
}