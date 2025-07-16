import { createAsyncThunk } from '@reduxjs/toolkit';
import { fetchWithCreds } from '../../utils.fetch';
import { requestErrored } from '../status/slice';

export const fetchBannerMessage = createAsyncThunk(
  'messageBanner/fetchBannerMessage',
  async (_, { dispatch, rejectWithValue }) => {
    try {
      const { data, status } = await fetchWithCreds({
        path: '/amanuensis/notifications',
        method: 'GET',
        onError: () => dispatch(requestErrored()),
      });

      if (status !== 200) {
        console.error(`fetchBannerMessage failed with status ${status}`);
        return rejectWithValue('Failed to fetch messages for banner');
      }
      return data;
    } catch (e) {
      rejectWithValue(e);
    }
  },
);
