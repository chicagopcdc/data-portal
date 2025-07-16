import { createSlice } from '@reduxjs/toolkit';
import { fetchBannerMessage } from './asyncThunks';

const initialState = {
  messages: '',
  status: 'idle',
};

const slice = createSlice({
  name: 'messageBanner',
  initialState: initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchBannerMessage.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchBannerMessage.fulfilled, (state, action) => {
        state.status = 'successful';
        state.messages = action.payload;
      })
      .addCase(fetchBannerMessage.rejected, (state) => {
        state.status = 'failed';
      });
  },
});

export default slice.reducer;
