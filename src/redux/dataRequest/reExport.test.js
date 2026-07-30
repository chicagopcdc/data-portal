import { configureStore } from '@reduxjs/toolkit';
import reducer from './slice';
import { exportProjectAgain, startProjectReExport } from './asyncThunks';
import { RE_EXPORT_STATUS } from './constants';

function createStore() {
  return configureStore({
    reducer: {
      dataRequest: reducer,
    },
  });
}

describe('project re-export', () => {
  beforeEach(() => {
    fetch.resetMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('starts an export job for the selected project', async () => {
    const store = createStore();
    fetch.mockResponseOnce(
      JSON.stringify({
        job_uid: 'export-job-uid',
        project_id: '904',
        search_id: 1805,
      }),
      { status: 200 },
    );

    await store.dispatch(exportProjectAgain(904));

    expect(fetch).toHaveBeenCalledWith(
      '/amanuensis/admin/project/export/904',
      expect.objectContaining({
        method: 'POST',
        body: '{}',
      }),
    );
    expect(store.getState().dataRequest.reExportJobs[904]).toEqual({
      job_uid: 'export-job-uid',
      project_id: '904',
      search_id: 1805,
      status: RE_EXPORT_STATUS.RUNNING,
      error: null,
    });
  });

  it('polls until the export job completes', async () => {
    const store = createStore();
    fetch
      .mockResponseOnce(
        JSON.stringify({
          job_uid: 'export-job-uid',
          project_id: '904',
          search_id: 1805,
        }),
        { status: 200 },
      )
      .mockResponseOnce(JSON.stringify({ status: 'rUn-NiNg' }), { status: 200 })
      .mockResponseOnce(JSON.stringify({ status: 'SuCcEeDeD' }), {
        status: 200,
      });

    await store.dispatch(startProjectReExport(904));

    expect(store.getState().dataRequest.reExportJobs[904].status).toBe(
      RE_EXPORT_STATUS.RUNNING,
    );
    expect(jest.getTimerCount()).toBe(1);

    await jest.advanceTimersByTimeAsync(5000);

    expect(fetch).toHaveBeenLastCalledWith(
      expect.stringContaining('job/status?UID=export-job-uid'),
      expect.objectContaining({ method: 'GET' }),
    );
    expect(store.getState().dataRequest.reExportJobs[904].status).toBe(
      RE_EXPORT_STATUS.COMPLETED,
    );
    expect(jest.getTimerCount()).toBe(0);
  });

  it('keeps polling after a temporary status request error', async () => {
    const store = createStore();
    fetch
      .mockResponseOnce(
        JSON.stringify({
          job_uid: 'export-job-uid',
          project_id: '904',
          search_id: 1805,
        }),
        { status: 200 },
      )
      .mockResponseOnce('Service unavailable', { status: 503 })
      .mockResponseOnce(JSON.stringify({ status: 'Completed' }), {
        status: 200,
      });

    await store.dispatch(startProjectReExport(904));

    expect(store.getState().dataRequest.reExportJobs[904]).toMatchObject({
      status: RE_EXPORT_STATUS.RUNNING,
      error: 'Service unavailable',
    });
    expect(jest.getTimerCount()).toBe(1);

    await jest.advanceTimersByTimeAsync(5000);

    expect(store.getState().dataRequest.reExportJobs[904]).toMatchObject({
      status: RE_EXPORT_STATUS.COMPLETED,
      error: null,
    });
    expect(jest.getTimerCount()).toBe(0);
  });

  it('continues polling when the backend adds an unknown status', async () => {
    const store = createStore();
    fetch
      .mockResponseOnce(
        JSON.stringify({
          job_uid: 'export-job-uid',
          project_id: '904',
          search_id: 1805,
        }),
        { status: 200 },
      )
      .mockResponseOnce(JSON.stringify({ status: 'Awaiting Worker' }), {
        status: 200,
      })
      .mockResponseOnce(JSON.stringify({ status: 'completed' }), {
        status: 200,
      });

    await store.dispatch(startProjectReExport(904));

    expect(store.getState().dataRequest.reExportJobs[904].status).toBe(
      RE_EXPORT_STATUS.UNKNOWN,
    );
    expect(jest.getTimerCount()).toBe(1);

    await jest.advanceTimersByTimeAsync(5000);

    expect(store.getState().dataRequest.reExportJobs[904].status).toBe(
      RE_EXPORT_STATUS.COMPLETED,
    );
    expect(jest.getTimerCount()).toBe(0);
  });
});
