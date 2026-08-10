import { getGQLFilter } from '../../GuppyComponents/Utils/queries';
import {
  buildDensityHeatmapCacheKey,
  groupFieldPathsByCategory,
} from '../../GuppyDataExplorer/ExplorerDensityHeatmap/utils';
import { fetchCategoryDensity } from './densityHeatmapAPI';
import {
  densityHeatmapCategoryFailed,
  densityHeatmapCategoryLoaded,
  densityHeatmapCategoryLoading,
  densityHeatmapJobFinished,
  densityHeatmapJobStarted,
  resetDensityHeatmapResult,
} from './slice';

const CONCURRENCY = 2;

let jobGeneration = 0;
/** @type {AbortController | null} */
let jobAbortController = null;
/** @type {Set<string>} */
let priorityCategoryKeys = new Set();

/**
 * Prefer loading a category next (e.g. when its section scrolls into view).
 * @param {string} categoryKey
 */
export function prioritizeDensityHeatmapCategory(categoryKey) {
  if (categoryKey) priorityCategoryKeys.add(categoryKey);
}

/**
 * Progressive, cancellable density load: one category at a time, concurrency 2.
 * Survives leaving the heatmap view because work is owned by Redux + this module.
 *
 * @param {{
 *  dataType: string;
 *  fieldPaths: string[];
 *  filter: object;
 *  totalCount: number;
 * }} args
 */
export function loadDensityHeatmap(args) {
  return async (dispatch, getState) => {
    const { dataType, fieldPaths = [], filter = {}, totalCount = 0 } = args;

    if (!dataType || fieldPaths.length === 0) {
      jobGeneration += 1;
      if (jobAbortController) jobAbortController.abort();
      jobAbortController = null;
      priorityCategoryKeys = new Set();
      dispatch(resetDensityHeatmapResult());
      return;
    }

    const gqlFilter = getGQLFilter(filter) ?? {};
    const cacheKey = buildDensityHeatmapCacheKey({
      dataType,
      fieldPaths,
      gqlFilter,
      totalCount,
    });
    const categories = groupFieldPathsByCategory(fieldPaths);
    const current = getState().explorer.densityHeatmapResult;

    if (current.cacheKey === cacheKey) {
      if (current.isPending) return;
      if (
        current.totalCategories > 0 &&
        current.loadedCount >= current.totalCategories
      ) {
        return;
      }
    }

    jobGeneration += 1;
    const myGeneration = jobGeneration;
    if (jobAbortController) jobAbortController.abort();
    jobAbortController = new AbortController();
    const { signal } = jobAbortController;
    priorityCategoryKeys = new Set();

    const resumeSameJob = current.cacheKey === cacheKey;
    const alreadyLoaded = new Set(
      resumeSameJob ? current.loadedCategoryKeys : [],
    );

    dispatch(
      densityHeatmapJobStarted({
        cacheKey,
        categoryKeys: categories.map((category) => category.key),
        keepRows: resumeSameJob,
      }),
    );

    /** @type {{ key: string, fields: string[] }[]} */
    const queue = categories.filter(
      (category) => !alreadyLoaded.has(category.key),
    );

    /**
     * @param {{ key: string, fields: string[] }} category
     */
    async function fetchOne(category) {
      if (myGeneration !== jobGeneration) return;

      dispatch(
        densityHeatmapCategoryLoading({
          cacheKey,
          categoryKey: category.key,
        }),
      );

      try {
        const rows = await fetchCategoryDensity({
          dataType,
          fieldPaths: category.fields,
          gqlFilter,
          totalCount,
          signal,
        });
        if (myGeneration !== jobGeneration) return;
        dispatch(
          densityHeatmapCategoryLoaded({
            cacheKey,
            categoryKey: category.key,
            rows,
          }),
        );
      } catch (err) {
        if (err?.name === 'AbortError') return;
        if (myGeneration !== jobGeneration) return;
        // eslint-disable-next-line no-console
        console.error(err);
        dispatch(
          densityHeatmapCategoryFailed({
            cacheKey,
            categoryKey: category.key,
            error: 'Unable to load density data from the GraphQL API.',
          }),
        );
      }
    }

    async function worker() {
      while (myGeneration === jobGeneration) {
        if (queue.length === 0) break;

        let nextIndex = queue.findIndex((category) =>
          priorityCategoryKeys.has(category.key),
        );
        if (nextIndex === -1) nextIndex = 0;

        const [category] = queue.splice(nextIndex, 1);
        priorityCategoryKeys.delete(category.key);
        await fetchOne(category);
      }
    }

    const workerCount = Math.min(CONCURRENCY, queue.length);
    if (workerCount > 0) {
      await Promise.all(
        Array.from({ length: workerCount }, () => worker()),
      );
    }

    if (myGeneration === jobGeneration) {
      dispatch(densityHeatmapJobFinished({ cacheKey }));
      jobAbortController = null;
    }
  };
}
