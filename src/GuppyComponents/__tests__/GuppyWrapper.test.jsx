import { render, waitFor } from '@testing-library/react';
import GuppyWrapper from '../GuppyWrapper';
import * as queries from '../Utils/queries';

jest.mock('../Utils/queries', () => ({
  ...jest.requireActual('../Utils/queries'),
  getAllFieldsFromGuppy: jest.fn(() => Promise.resolve([])),
  queryGuppyForAggregationChartData: jest.fn(),
  queryGuppyForAggregationCountData: jest.fn(),
  queryGuppyForAggregationOptionsData: jest.fn(),
  queryGuppyForExternalResourceAggs: jest.fn(),
  queryGuppyForRawData: jest.fn(),
}));

// keep prop references stable: GuppyWrapper refetches whenever they change
const guppyConfig = { dataType: 'subject' };
const filterConfig = { tabs: [] };
const chartConfig = {};
const explorerFilter = {};
const adminAppliedPreFilters = {};
const rawDataFields = ['sex'];

/** @param {(data: any) => void} onData */
function renderWrapper(onData) {
  return render(
    <GuppyWrapper
      adminAppliedPreFilters={adminAppliedPreFilters}
      chartConfig={chartConfig}
      explorerFilter={explorerFilter}
      filterConfig={filterConfig}
      guppyConfig={guppyConfig}
      rawDataFields={rawDataFields}
    >
      {(data) => {
        onData(data);
        return null;
      }}
    </GuppyWrapper>,
  );
}

describe('GuppyWrapper error handling', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    queries.queryGuppyForAggregationCountData.mockResolvedValue({
      data: { _aggregation: { accessible: { _totalCount: 1 }, all: { _totalCount: 1 } } },
    });
    queries.queryGuppyForAggregationOptionsData.mockResolvedValue({
      data: { _aggregation: {} },
    });
    queries.queryGuppyForExternalResourceAggs.mockResolvedValue({ data: {} });
    queries.queryGuppyForRawData.mockResolvedValue({
      data: { subject: [] },
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  test('stops loading and exposes the Guppy error message on a 400', async () => {
    queries.queryGuppyForAggregationChartData.mockResolvedValue({
      errors: [
        {
          message:
            'Cannot query field "mass_present" on type "NestedHistogramForBiopsy_surgical_procedures".',
        },
      ],
    });

    let latest;
    renderWrapper((data) => {
      latest = data;
    });

    await waitFor(() => expect(latest.guppyError).toBeDefined());
    expect(latest.guppyError).toContain('mass_present');
    expect(latest.isLoadingAggsData).toBe(false);
  });

  test('stops loading raw data when the raw data query fails', async () => {
    queries.queryGuppyForAggregationChartData.mockResolvedValue({
      data: { _aggregation: { subject: {} } },
    });
    queries.queryGuppyForRawData.mockRejectedValue(new SyntaxError('bad json'));

    let latest;
    renderWrapper((data) => {
      latest = data;
    });

    await waitFor(() => expect(latest.isLoadingRawData).toBe(false));
    await waitFor(() => expect(latest.guppyError).toBeDefined());
    expect(latest.guppyError).toBe(
      'The data service returned an unexpected response.',
    );
  });

  test('ignores aborted requests', async () => {
    const abortError = new Error('aborted');
    abortError.name = 'AbortError';
    queries.queryGuppyForAggregationChartData.mockRejectedValue(abortError);

    let latest;
    renderWrapper((data) => {
      latest = data;
    });

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(latest.guppyError).toBeUndefined();
  });
});
