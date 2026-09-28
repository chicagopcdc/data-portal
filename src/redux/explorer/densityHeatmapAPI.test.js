import { fetchWithCreds } from '../utils.fetch';
import { fetchCategoryDensity } from './densityHeatmapAPI';

jest.mock('../utils.fetch', () => ({
  fetchWithCreds: jest.fn(),
}));

const args = {
  dataType: 'subject',
  fieldPaths: [
    'disease_characteristics.mki',
    'disease_characteristics.bulk_disease',
  ],
  gqlFilter: {},
  totalCount: 10,
};

function aggregationResponse(main) {
  return {
    status: 200,
    data: {
      data: {
        _aggregation: { main },
      },
    },
  };
}

describe('fetchCategoryDensity', () => {
  beforeEach(() => {
    fetchWithCreds.mockReset();
  });

  it('returns rows from a successful category query', async () => {
    fetchWithCreds.mockResolvedValueOnce(
      aggregationResponse({
        disease_characteristics: {
          mki: { histogram: [{ key: 'low', count: 4 }] },
          bulk_disease: { histogram: [{ key: 'yes', count: 2 }] },
        },
      }),
    );

    const rows = await fetchCategoryDensity(args);
    expect(fetchWithCreds).toHaveBeenCalledTimes(1);
    expect(rows).toEqual([
      {
        availableCount: 4,
        completeness: 0.4,
        field: 'disease_characteristics.mki',
        missingCount: 6,
      },
      {
        availableCount: 2,
        completeness: 0.2,
        field: 'disease_characteristics.bulk_disease',
        missingCount: 8,
      },
    ]);
  });

  it('uses aggregation data even when GraphQL also returns errors', async () => {
    fetchWithCreds.mockResolvedValueOnce({
      status: 200,
      data: {
        errors: [{ message: 'Field text_blob is not aggregatable' }],
        data: {
          _aggregation: {
            main: {
              disease_characteristics: {
                mki: { histogram: [{ key: 'low', count: 4 }] },
                bulk_disease: { histogram: [{ key: 'yes', count: 2 }] },
              },
            },
          },
        },
      },
    });

    const rows = await fetchCategoryDensity(args);
    expect(fetchWithCreds).toHaveBeenCalledTimes(1);
    expect(rows).toHaveLength(2);
    expect(rows[0].field).toBe('disease_characteristics.mki');
  });

  it('splits a failed category query and loads fields that succeed on their own', async () => {
    fetchWithCreds
      .mockResolvedValueOnce({
        status: 200,
        data: { errors: [{ message: 'too many nested aggregations' }] },
      })
      .mockResolvedValueOnce(
        aggregationResponse({
          disease_characteristics: {
            mki: { histogram: [{ key: 'low', count: 4 }] },
          },
        }),
      )
      .mockResolvedValueOnce({
        status: 200,
        data: { errors: [{ message: 'bulk_disease is not aggregatable' }] },
      });

    const rows = await fetchCategoryDensity(args);
    expect(fetchWithCreds).toHaveBeenCalledTimes(3);
    expect(rows).toEqual([
      {
        availableCount: 4,
        completeness: 0.4,
        field: 'disease_characteristics.mki',
        missingCount: 6,
      },
    ]);
  });

  it('throws when every split query fails', async () => {
    fetchWithCreds.mockResolvedValue({
      status: 200,
      data: { errors: [{ message: 'not aggregatable' }] },
    });

    await expect(fetchCategoryDensity(args)).rejects.toThrow('not aggregatable');
    expect(fetchWithCreds).toHaveBeenCalledTimes(3);
  });
});
