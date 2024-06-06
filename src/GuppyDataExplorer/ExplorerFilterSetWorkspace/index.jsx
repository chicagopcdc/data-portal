import { useState, useRef, useCallback, memo } from 'react';
import SimplePopup from '../../components/SimplePopup';
import Tooltip from 'rc-tooltip';
import {
  createFilterSet,
  deleteFilterSet,
  updateFilterSet,
} from '../../redux/explorer/asyncThunks';
import {
  createToken,
  fetchWithToken,
} from '../../redux/explorer/filterSetsAPI';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import FilterSetActionForm from './FilterSetActionForm';
import FilterSetLabel from './FilterSetLabel';
import useFilterSetWorkspace from './useFilterSetWorkspace';
import {
  dereferenceFilter,
  FILTER_TYPE,
} from './utils';
import { getExpandedStatus } from '../../gen3-ui-component/components/filters/FilterGroup/utils';
import './ExplorerFilterSetWorkspace.css';
import ExplorerFilter, { CombinedExplorerFilter } from '../ExplorerFilter';
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
  Group
} from 'react-aria-components';

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

/** @typedef {import('../types').SavedExplorerFilterSet} SavedExplorerFilterSet */
/** @typedef {import('./FilterSetActionForm').ActionFormType} ActionFormType */
/** @typedef {import('../types').ExplorerFilterSet} ExplorerFilterSet */
/** @typedef {import('../types').UnsavedExplorerFilterSet} UnsavedExplorerFilterSet */

function ExplorerFilterSetWorkspace({
  anchorValue,
  initialTabsOptions,
  onAnchorValueChange,
  onFilterChange,
  tabsOptions,
  dictionaryEntries,
}) {
  const dispatch = useAppDispatch();
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
  const { config: { filterConfig } } = useAppSelector((state) => state.explorer);
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

  return (
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
                  onFilterChange(savedFilterSet.filter);
                  return;
                case 'RESET':
                  const composedResetFilter = {
                    __type: FILTER_TYPE.COMPOSED,
                    __combineMode: /** @type {'AND' | 'OR'} */ ('AND'),
                    refIds: [],
                    value: [],
                  };
                  onFilterChange(filterSet.filter.__type === 'COMPOSED' ? composedResetFilter : undefined);
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
                      onFilterChange={onFilterChange}
                      className='explorer__filter explorer__combined-filter'
                    />
                  ) : (
                    <ExplorerFilter
                      title={filterSet.name}
                      anchorValue={anchorValue}
                      className='explorer__filter'
                      filter={filterSet.filter}
                      initialTabsOptions={initialTabsOptions}
                      onAnchorValueChange={onAnchorValueChange}
                      onFilterChange={onFilterChange}
                      tabsOptions={tabsOptions}
                      dictionaryEntries={dictionaryEntries}
                      filterUIState={workspaceUIState.current[workspaceId]}
                    />
                  )}
              </div>
            </TabPanel>;
        })}
      </Tabs>
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
  );
}

export default memo(ExplorerFilterSetWorkspace);
