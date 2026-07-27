import {
  fetchRequestConfigTemplates,
  REQUEST_CONFIG_TEMPLATES_PATH,
} from './requestConfigTemplates';

beforeEach(() => {
  global.fetch = jest.fn();
});

test('fetches request templates through the template service', async () => {
  const templates = [
    {
      id: 'example',
      name: 'Example',
      white_list: { subject: ['submitter_id'] },
    },
  ];
  global.fetch.mockResolvedValue({
    ok: true,
    json: jest.fn().mockResolvedValue({ templates }),
  });

  await expect(fetchRequestConfigTemplates()).resolves.toEqual(templates);
  expect(global.fetch).toHaveBeenCalledWith(REQUEST_CONFIG_TEMPLATES_PATH);
});

test('rejects invalid template responses', async () => {
  global.fetch.mockResolvedValue({ ok: false });

  await expect(fetchRequestConfigTemplates()).rejects.toThrow(
    'Unable to load request configuration templates.',
  );
});
