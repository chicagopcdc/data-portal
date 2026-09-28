import { fetchWithCreds } from '../utils.fetch';
import { guppyGraphQLUrl } from '../../localconf';
import {
  buildCategoryAggregationQuery,
  dropObjectPrefixFieldPaths,
  isEmptyGqlFilter,
  parseDensityRowsFromAggregation,
} from '../../GuppyDataExplorer/ExplorerDensityHeatmap/utils';

/**
 * One GraphQL aggregation request for the given field paths.
 * @param {{
 *  dataType: string;
 *  fieldPaths: string[];
 *  gqlFilter: object;
 *  totalCount: number;
 *  signal?: AbortSignal;
 * }} args
 */
export async function fetchFieldBatch({
  dataType,
  fieldPaths,
  gqlFilter,
  totalCount,
  signal,
}) {
  const queryFieldPaths = dropObjectPrefixFieldPaths(fieldPaths);
  if (queryFieldPaths.length === 0) return [];

  const hasFilter = !isEmptyGqlFilter(gqlFilter);
  const body = {
    query: buildCategoryAggregationQuery(
      dataType,
      queryFieldPaths,
      gqlFilter,
    ),
    ...(hasFilter ? { variables: { filter_main: gqlFilter } } : {}),
  };

  const response = await fetchWithCreds({
    path: guppyGraphQLUrl,
    method: 'POST',
    body: JSON.stringify(body),
    signal,
  });

  const payload = response?.data;
  const aggregation = payload?.data?._aggregation?.main;

  if (aggregation) {
    return parseDensityRowsFromAggregation({
      aggregation,
      fieldPaths: queryFieldPaths,
      totalCount,
    });
  }

  const message =
    payload?.errors?.[0]?.message ||
    `Density aggregation failed (${response?.status ?? 'unknown'})`;
  throw new Error(message);
}

/**
 * Fetch density rows for one category. If the combined query fails (timeout,
 * one non-aggregatable field, parent-object histogram), split the field list
 * until some rows can be loaded.
 * @param {{
 *  dataType: string;
 *  fieldPaths: string[];
 *  gqlFilter: object;
 *  totalCount: number;
 *  signal?: AbortSignal;
 * }} args
 */
export async function fetchCategoryDensity(args) {
  return fetchFieldsBySplitting(dropObjectPrefixFieldPaths(args.fieldPaths), args);
}

/**
 * @param {string[]} fieldPaths
 * @param {{
 *  dataType: string;
 *  gqlFilter: object;
 *  totalCount: number;
 *  signal?: AbortSignal;
 * }} args
 */
async function fetchFieldsBySplitting(fieldPaths, args) {
  if (fieldPaths.length === 0) return [];

  try {
    return await fetchFieldBatch({
      ...args,
      fieldPaths,
    });
  } catch (err) {
    if (err?.name === 'AbortError') throw err;
    if (args.signal?.aborted) {
      const abortError = new Error('Aborted');
      abortError.name = 'AbortError';
      throw abortError;
    }
    if (fieldPaths.length === 1) throw err;

    const mid = Math.ceil(fieldPaths.length / 2);
    const left = fieldPaths.slice(0, mid);
    const right = fieldPaths.slice(mid);

    const [leftRows, rightRows] = await Promise.all([
      fetchFieldsBySplitting(left, args).catch((splitErr) => {
        if (splitErr?.name === 'AbortError') throw splitErr;
        return [];
      }),
      fetchFieldsBySplitting(right, args).catch((splitErr) => {
        if (splitErr?.name === 'AbortError') throw splitErr;
        return [];
      }),
    ]);

    const rows = [...leftRows, ...rightRows];
    if (rows.length === 0) throw err;
    return rows;
  }
}
