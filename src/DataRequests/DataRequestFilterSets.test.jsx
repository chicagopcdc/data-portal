import { configureStore } from '@reduxjs/toolkit';
import { fireEvent, render, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import DataRequestFilterSets from './DataRequestFilterSets';
import dataRequestReducer from '../redux/dataRequest/slice';
import { addFiltersetToRequest } from '../redux/dataRequest/asyncThunks';

// renders a filter from the explorer config, which is not what is under test here
jest.mock('../GuppyDataExplorer/ExplorerFilterDisplay', () => ({
  __esModule: true,
  default: ({ title }) => <div>{title}</div>,
}));

const PROJECT_ID = 904;

function projectFilterSet(id, name, consortium) {
  return {
    id,
    name,
    filter_object: null,
    filter_source_internal_id: null,
    ids_list: null,
    graphql_object: { AND: [{ IN: { consortium: [consortium] } }] },
  };
}

function createStore() {
  return configureStore({ reducer: { dataRequest: dataRequestReducer } });
}

/** Answers the project's filter sets from `projectFilterSets`, and 200 to the rest. */
function mockAmanuensis(projectFilterSets) {
  fetch.mockResponse((request) => {
    if (request.url.includes(`/project_filter_sets/${PROJECT_ID}`)) {
      return Promise.resolve(JSON.stringify(projectFilterSets));
    }
    return Promise.resolve(JSON.stringify({ id: PROJECT_ID }));
  });
}

function renderFilterSets(onAction = jest.fn()) {
  return render(
    <Provider store={createStore()}>
      <DataRequestFilterSets
        projectId={PROJECT_ID}
        savedFilterSets={{}}
        onAction={onAction}
        admin
      />
    </Provider>,
  );
}

function requestsTo(path) {
  return fetch.mock.calls.filter(([url]) => String(url).includes(path));
}

describe('DataRequestFilterSets', () => {
  beforeEach(() => {
    fetch.resetMocks();
    // SimplePopup renders into #root
    const root = document.createElement('div');
    root.id = 'root';
    document.body.appendChild(root);
  });

  afterEach(() => {
    document.getElementById('root')?.remove();
  });

  it('removes a filter set after confirmation', async () => {
    mockAmanuensis([
      projectFilterSet(11, 'INRG cohort', 'INRG'),
      projectFilterSet(12, 'INSTRUCT cohort', 'INSTRUCT'),
    ]);
    const onAction = jest.fn();
    const { findAllByRole, findByRole, getByText } = renderFilterSets(onAction);

    const removeButtons = await findAllByRole('button', { name: 'Remove' });
    expect(removeButtons).toHaveLength(2);

    fireEvent.click(removeButtons[1]);
    expect(
      getByText('Remove “INSTRUCT cohort” from this project?'),
    ).toBeInTheDocument();

    // nothing is sent until the removal is confirmed
    expect(requestsTo('/remove-search-from-project')).toHaveLength(0);

    const popup = document.getElementById('root');
    fireEvent.click(
      [...popup.querySelectorAll('button')].find(
        (button) => button.textContent === 'Remove',
      ),
    );

    await waitFor(() =>
      expect(requestsTo('/remove-search-from-project')).toHaveLength(1),
    );
    const [, options] = requestsTo('/remove-search-from-project')[0];
    expect(options.method).toBe('DELETE');
    expect(JSON.parse(options.body)).toEqual({
      searchIds: [12],
      projectId: PROJECT_ID,
    });

    await waitFor(() =>
      expect(onAction).toHaveBeenCalledWith('SUCCESSFUL_FILTER_SET_CHANGE'),
    );
    // the list is fetched again to show what the project now holds
    await waitFor(() =>
      expect(requestsTo(`/project_filter_sets/${PROJECT_ID}`)).toHaveLength(2),
    );
    await findByRole('heading', { name: 'Current Filters:' });
  });

  it('cancelling leaves the project alone', async () => {
    mockAmanuensis([
      projectFilterSet(11, 'INRG cohort', 'INRG'),
      projectFilterSet(12, 'INSTRUCT cohort', 'INSTRUCT'),
    ]);
    const { findAllByRole, getByRole, queryByText } = renderFilterSets();

    fireEvent.click((await findAllByRole('button', { name: 'Remove' }))[0]);
    fireEvent.click(getByRole('button', { name: 'Cancel' }));

    expect(queryByText(/from this project\?/)).not.toBeInTheDocument();
    expect(requestsTo('/remove-search-from-project')).toHaveLength(0);
  });

  it('does not offer to remove the only filter set', async () => {
    mockAmanuensis([projectFilterSet(11, 'INRG cohort', 'INRG')]);
    const { findByRole } = renderFilterSets();

    expect(await findByRole('button', { name: 'Remove' })).toHaveClass(
      'g3-button--disabled',
    );
  });
});

describe('addFiltersetToRequest', () => {
  beforeEach(() => {
    fetch.resetMocks();
  });

  it('adds to the project rather than replacing its filter sets', async () => {
    fetch.mockResponseOnce(JSON.stringify({ id: PROJECT_ID }));

    await createStore().dispatch(
      addFiltersetToRequest({
        filtersetId: 7,
        projectId: PROJECT_ID,
        mode: 'add',
      }),
    );

    const [url, options] = fetch.mock.calls[0];
    expect(url).toContain('/amanuensis/admin/copy-search-to-project');
    expect(JSON.parse(options.body)).toEqual({
      filtersetId: 7,
      projectId: PROJECT_ID,
      mode: 'add',
    });
  });
});
