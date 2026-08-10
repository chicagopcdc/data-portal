import { fetchWithCreds } from '../utils.fetch';
import { guppyGraphQLUrl } from '../../localconf';
import {
  buildCategoryAggregationQuery,
  parseDensityRowsFromAggregation,
} from '../../GuppyDataExplorer/ExplorerDensityHeatmap/utils';

/**
 * Fetch density rows for one category (field-path group).
 * @param {{
 *  dataType: string;
 *  fieldPaths: string[];
 *  gqlFilter: object;
 *  totalCount: number;
 *  signal?: AbortSignal;
 * }} args
 */
export async function fetchCategoryDensity({
  dataType,
  fieldPaths,
  gqlFilter,
  totalCount,
  signal,
}) {
  const body = {
    query: buildCategoryAggregationQuery(dataType, fieldPaths),
    variables: { filter_main: gqlFilter ?? {} },
  };

  const response = await fetchWithCreds({
    path: guppyGraphQLUrl,
    method: 'POST',
    body: JSON.stringify(body),
    signal,
  });

  if (response?.data?.errors?.length) {
    throw new Error(response.data.errors[0]?.message || 'GraphQL error');
  }

  const aggregation = response?.data?.data?._aggregation?.main;
  return parseDensityRowsFromAggregation({
    aggregation,
    fieldPaths,
    totalCount,
  });
}
