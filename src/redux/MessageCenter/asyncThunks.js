import { createAsyncThunk } from '@reduxjs/toolkit';
import { fetchWithCreds } from '../../utils.fetch';
import { requestErrored } from '../status/slice';

export const fetchMessages = createAsyncThunk(
  'messageCenter/fetchMessages',
  async (_, { dispatch, rejectWithValue }) => {
    try {
      const { data, status } = await fetchWithCreds({
        path: '/amanuensis/notifications/all',
        method: 'GET',
        onError: () => dispatch(requestErrored()),
      });

      if (status !== 200) {
        console.error(`fetchMessages failed to with status ${status}`);
        return rejectWithValue('Failed to fetch messages');
      }
      return data;
    } catch (e) {
      rejectWithValue(e);
    }
  },
);
