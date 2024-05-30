import { useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import {
  clearWorkspaceAllFilterSets,
  createWorkspaceFilterSet,
  duplicateWorkspaceFilterSet,
  loadWorkspaceFilterSet,
  removeWorkspaceFilterSet,
  useWorkspaceFilterSet,
  createCombinedWorkspaceFilterSet,
  updateActiveFilterSetName
} from '../../redux/explorer/slice';
import { workspacesSessionStorageKey } from '../../redux/explorer/utils';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';

/** @typedef {import("../types").ExplorerFilter} ExplorerFilter */
/** @typedef {import("../types").ExplorerFilterSet} ExplorerFilterSet */

export default function useFilterSetWorkspace() {
  const dispatch = useAppDispatch();
  const explorerId = useAppSelector((s) => s.explorer.explorerId);
  const workspaces = useAppSelector((s) => s.explorer.workspaces);
  const location = useLocation();
  useEffect(() => {
    // inject filter value passed via router
    /** @type {{ filter?: ExplorerFilter }} */
    const locationState = location.state;
    if (locationState?.filter !== undefined)
      dispatch(loadWorkspaceFilterSet({ filter: locationState.filter }));
  }, []);

  useEffect(() => {
    // sync browser store with workspace state
    const json = JSON.stringify(workspaces);
    window.sessionStorage.setItem(workspacesSessionStorageKey, json);
  }, [workspaces]);

  return useMemo(
    () => ({
      ...workspaces[explorerId],
      size: Object.keys(workspaces[explorerId].all).length,
      clearAll() {
        return dispatch(clearWorkspaceAllFilterSets());
      },
      create(workspaceId) {
        dispatch(createWorkspaceFilterSet(workspaceId));
      },
      createCombine(id) {
        dispatch(createCombinedWorkspaceFilterSet(id));
      },
      duplicate(id) {
        dispatch(duplicateWorkspaceFilterSet(id));
      },
      load(filterSet, newActiveId) {
        dispatch(loadWorkspaceFilterSet(filterSet, newActiveId));
      },
      remove(id, newActiveId) {
        dispatch(removeWorkspaceFilterSet(id, newActiveId));
      },
      use(id) {
        dispatch(useWorkspaceFilterSet(id));
      },
      rename(name) {
        dispatch(updateActiveFilterSetName(name));
      }
    }),
    [workspaces, explorerId]
  );
}
