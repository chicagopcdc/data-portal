import { getProjectDatapoints } from './asyncThunks';
import { fetchWithCreds } from '../../utils.fetch';

jest.mock('../../utils.fetch', () => ({
  fetchWithCreds: jest.fn(),
}));

describe('project datapoints', () => {
  beforeEach(() => {
    fetchWithCreds.mockReset();
  });

  it('loads all datapoints using the project id JSON payload', async () => {
    fetchWithCreds.mockResolvedValue({ data: [], status: 200 });

    await getProjectDatapoints(904)(jest.fn(), jest.fn(), undefined);

    expect(fetchWithCreds).toHaveBeenCalledWith({
      path: '/amanuensis/project-datapoints/get-datapoints',
      method: 'POST',
      body: JSON.stringify({ project_id: 904, many: true }),
    });
  });
});
