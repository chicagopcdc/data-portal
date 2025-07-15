import { createSlice } from '@reduxjs/toolkit';
import { fetchMessages } from './asyncThunks';

const slice = createSlice({
  name: 'messageCenter',
  initialState: { messages: [], status: 'idle' },
  reducers: {},
  extraReducers: (builder) => {
    {
      builder
        .addCase(fetchMessages.pending, (state) => {
          state.status = 'loading';
        })
        .addCase(fetchMessages.fulfilled, (state, action) => {
          state.status = 'succeeded';
          state.messages = action.payload;
        })
        .addCase(fetchMessages.rejected, (state) => {
          state.status = 'failed';
        });
    }
  },
});

export default slice.reducer;
