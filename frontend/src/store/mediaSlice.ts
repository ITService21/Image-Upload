import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { StatusFilter } from '../types';

interface MediaState {
  selectedIds: number[];
  statusFilter: StatusFilter;
  companyFilter: number | null;
  searchQuery: string;
}

const initialState: MediaState = {
  selectedIds: [],
  statusFilter: 'all',
  companyFilter: null,
  searchQuery: '',
};

const mediaSlice = createSlice({
  name: 'media',
  initialState,
  reducers: {
    toggleSelect(state, action: PayloadAction<number>) {
      const idx = state.selectedIds.indexOf(action.payload);
      if (idx >= 0) {
        state.selectedIds.splice(idx, 1);
      } else {
        state.selectedIds.push(action.payload);
      }
    },
    selectAll(state, action: PayloadAction<number[]>) {
      state.selectedIds = action.payload;
    },
    clearSelection(state) {
      state.selectedIds = [];
    },
    setStatusFilter(state, action: PayloadAction<StatusFilter>) {
      state.statusFilter = action.payload;
    },
    setCompanyFilter(state, action: PayloadAction<number | null>) {
      state.companyFilter = action.payload;
    },
    setSearchQuery(state, action: PayloadAction<string>) {
      state.searchQuery = action.payload;
    },
  },
});

export const {
  toggleSelect,
  selectAll,
  clearSelection,
  setStatusFilter,
  setCompanyFilter,
  setSearchQuery,
} = mediaSlice.actions;

export default mediaSlice.reducer;
