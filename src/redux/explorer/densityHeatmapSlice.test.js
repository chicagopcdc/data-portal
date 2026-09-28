import { configureStore } from '@reduxjs/toolkit';
import explorerReducer, {
  densityHeatmapCategoryFailed,
  densityHeatmapCategoryLoaded,
  densityHeatmapJobStarted,
} from './slice';

function createStore() {
  return configureStore({
    reducer: {
      explorer: explorerReducer,
    },
  });
}

const cacheKey = 'density-test-cache';

describe('densityHeatmapResult reducers', () => {
  it('does not count failed categories as loaded', () => {
    const store = createStore();

    store.dispatch(
      densityHeatmapJobStarted({
        cacheKey,
        categoryKeys: ['A', 'B'],
      }),
    );

    store.dispatch(
      densityHeatmapCategoryFailed({
        cacheKey,
        categoryKey: 'A',
        error: 'Unable to load density data from the GraphQL API.',
      }),
    );

    store.dispatch(
      densityHeatmapCategoryLoaded({
        cacheKey,
        categoryKey: 'B',
        rows: [
          {
            availableCount: 2,
            completeness: 1,
            field: 'B.field',
            missingCount: 0,
          },
        ],
      }),
    );

    const result = store.getState().explorer.densityHeatmapResult;
    expect(result.categoryStatus.A).toBe('error');
    expect(result.categoryStatus.B).toBe('loaded');
    expect(result.loadedCategoryKeys).toEqual(['B']);
    expect(result.loadedCount).toBe(1);
    expect(result.error).toBe('Unable to load density data from the GraphQL API.');
  });
});
