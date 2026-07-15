import { configureStore } from '@reduxjs/toolkit';
import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import AdminProjectActions from './AdminProjectActions';
import dataRequestReducer from '../redux/dataRequest/slice';

function renderActions(reExportJob) {
  const initialDataRequestState = dataRequestReducer(undefined, {
    type: 'test/init',
  });
  const store = configureStore({
    reducer: {
      dataRequest: dataRequestReducer,
    },
    preloadedState: {
      dataRequest: {
        ...initialDataRequestState,
        reExportJobs: reExportJob ? { 904: reExportJob } : {},
      },
    },
  });

  return render(
    <Provider store={store}>
      <AdminProjectActions
        project={{ id: 904, name: 'Test project', status: 'Approved' }}
        projectStates={{ Approved: { id: 1, code: 'APPROVED' } }}
        savedFilterSets={{}}
      />
    </Provider>,
  );
}

describe('AdminProjectActions re-export action', () => {
  it('shows Export Again when no export is active', () => {
    const { getByRole } = renderActions();

    expect(getByRole('button', { name: 'Export Again' })).toBeEnabled();
  });

  it('keeps other admin actions available while an export runs', () => {
    const { getByRole, getByText } = renderActions({
      job_uid: 'export-job-uid',
      status: 'Running',
      error: null,
    });

    expect(getByRole('button', { name: 'Exporting...' })).toHaveClass(
      'g3-button--disabled',
    );
    expect(getByRole('button', { name: 'Update State' })).not.toHaveClass(
      'g3-button--disabled',
    );
    expect(getByText('Export job in progress.')).toBeInTheDocument();
  });
});
