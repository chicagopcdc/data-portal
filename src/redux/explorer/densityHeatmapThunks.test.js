import { configureStore } from '@reduxjs/toolkit';
import { fetchCategoryDensity } from './densityHeatmapAPI';
import {
  fetchCategoryDensityWithRetry,
  loadDensityHeatmap,
  MAX_CATEGORY_FETCH_ATTEMPTS,
} from './densityHeatmapThunks';
import explorerReducer from './slice';

jest.mock('./densityHeatmapAPI', () => ({
  fetchCategoryDensity: jest.fn(),
}));

function createStore() {
  return configureStore({
    reducer: {
      explorer: explorerReducer,
    },
  });
}

const sampleRow = {
  availableCount: 2,
  completeness: 1,
  field: 'A.field',
  missingCount: 0,
};

describe('fetchCategoryDensityWithRetry', () => {
  it('retries twice after failure, then succeeds', async () => {
    const fetchOnce = jest
      .fn()
      .mockRejectedValueOnce(new Error('fail 1'))
      .mockRejectedValueOnce(new Error('fail 2'))
      .mockResolvedValueOnce(sampleRow);

    await expect(fetchCategoryDensityWithRetry(fetchOnce)).resolves.toEqual(
      sampleRow,
    );
    expect(fetchOnce).toHaveBeenCalledTimes(3);
  });

  it('throws after 3 failures', async () => {
    const fetchOnce = jest.fn().mockRejectedValue(new Error('still failing'));

    await expect(fetchCategoryDensityWithRetry(fetchOnce)).rejects.toThrow(
      'still failing',
    );
    expect(fetchOnce).toHaveBeenCalledTimes(MAX_CATEGORY_FETCH_ATTEMPTS);
  });

  it('does not retry AbortError', async () => {
    const abortError = new Error('Aborted');
    abortError.name = 'AbortError';
    const fetchOnce = jest.fn().mockRejectedValue(abortError);

    await expect(fetchCategoryDensityWithRetry(fetchOnce)).rejects.toMatchObject({
      name: 'AbortError',
    });
    expect(fetchOnce).toHaveBeenCalledTimes(1);
  });
});

describe('loadDensityHeatmap retries', () => {
  beforeEach(() => {
    fetchCategoryDensity.mockReset();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  it('retries a category fetch twice and then loads it', async () => {
    fetchCategoryDensity
      .mockRejectedValueOnce(new Error('fail 1'))
      .mockRejectedValueOnce(new Error('fail 2'))
      .mockResolvedValueOnce([sampleRow]);

    const store = createStore();
    await store.dispatch(
      loadDensityHeatmap('test-instance', {
        dataType: 'subject',
        fieldPaths: ['A.field'],
        filter: {},
        totalCount: 2,
      }),
    );

    const result = store.getState().explorer.densityHeatmapResult;
    expect(fetchCategoryDensity).toHaveBeenCalledTimes(3);
    expect(result.categoryStatus.A).toBe('loaded');
    expect(result.loadedCategoryKeys).toEqual(['A']);
    expect(result.loadedCount).toBe(1);
    expect(result.isPending).toBe(false);
  });

  it('emits one failed category after 3 failures and does not count it as loaded', async () => {
    fetchCategoryDensity.mockRejectedValue(new Error('still failing'));

    const store = createStore();
    await store.dispatch(
      loadDensityHeatmap('test-instance', {
        dataType: 'subject',
        fieldPaths: ['B.field'],
        filter: {},
        totalCount: 2,
      }),
    );

    const result = store.getState().explorer.densityHeatmapResult;
    expect(fetchCategoryDensity).toHaveBeenCalledTimes(3);
    expect(result.categoryStatus.B).toBe('error');
    expect(result.loadedCategoryKeys).toEqual([]);
    expect(result.loadedCount).toBe(0);
    expect(result.isPending).toBe(false);
    expect(result.error).toBe(
      'Unable to load density data from the GraphQL API.',
    );
  });
});
