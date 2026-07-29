import { configureStore } from '@reduxjs/toolkit';
import {
  fetchRequestConfigTemplates,
  REQUEST_CONFIG_TEMPLATES_PATH,
} from '../redux/dataRequest/asyncThunks';
import dataRequestReducer from '../redux/dataRequest/slice';

const createStore = () =>
  configureStore({
    reducer: { dataRequest: dataRequestReducer },
  });

const mockResponse = (data, status = 200) => ({
  status,
  statusText: status === 200 ? 'OK' : 'Not Found',
  headers: new Headers(),
  text: jest.fn().mockResolvedValue(JSON.stringify(data)),
});

beforeEach(() => {
  global.fetch = jest.fn();
});

test('fetches request templates into Redux state', async () => {
  const templates = [
    {
      id: 'example',
      name: 'Example',
      white_list: { subject: ['submitter_id'] },
    },
  ];
  global.fetch.mockResolvedValue(mockResponse({ templates }));
  const store = createStore();

  await store.dispatch(fetchRequestConfigTemplates());

  expect(store.getState().dataRequest.requestConfigTemplates).toEqual(
    templates,
  );
  expect(store.getState().dataRequest.isRequestConfigTemplatesPending).toBe(
    false,
  );
  expect(global.fetch).toHaveBeenCalledWith(
    REQUEST_CONFIG_TEMPLATES_PATH,
    expect.objectContaining({ credentials: 'include', method: 'GET' }),
  );
});

test('stores an error for invalid template responses', async () => {
  global.fetch.mockResolvedValue(mockResponse({}, 404));
  const store = createStore();

  await store.dispatch(fetchRequestConfigTemplates());

  expect(store.getState().dataRequest.requestConfigTemplatesError).toBe(
    'Unable to load request configuration templates.',
  );
  expect(store.getState().dataRequest.requestConfigTemplates).toEqual([]);
});
