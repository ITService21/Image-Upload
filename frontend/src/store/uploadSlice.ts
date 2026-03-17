import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { CompressionMethod, UploadFileItem } from '../types';

interface UploadState {
  files: UploadFileItem[];
  companyName: string;
  defaultCompressionMethod: CompressionMethod;
  compressionEnabled: boolean;
  uploadProgress: number;
  isUploading: boolean;
  step: number;
}

const initialState: UploadState = {
  files: [],
  companyName: '',
  defaultCompressionMethod: 'sharp',
  compressionEnabled: true,
  uploadProgress: 0,
  isUploading: false,
  step: 1,
};

const uploadSlice = createSlice({
  name: 'upload',
  initialState,
  reducers: {
    addFiles(state, action: PayloadAction<UploadFileItem[]>) {
      state.files.push(...action.payload);
    },
    removeFile(state, action: PayloadAction<string>) {
      state.files = state.files.filter((f) => f.id !== action.payload);
    },
    updateFileName(state, action: PayloadAction<{ id: string; fileName: string }>) {
      const file = state.files.find((f) => f.id === action.payload.id);
      if (file) file.fileName = action.payload.fileName;
    },
    updateFileCompression(state, action: PayloadAction<{ id: string; method: CompressionMethod }>) {
      const file = state.files.find((f) => f.id === action.payload.id);
      if (file) file.compressionMethod = action.payload.method;
    },
    toggleFileCompression(state, action: PayloadAction<string>) {
      const file = state.files.find((f) => f.id === action.payload);
      if (file) file.compressionEnabled = !file.compressionEnabled;
    },
    setCompanyName(state, action: PayloadAction<string>) {
      state.companyName = action.payload;
    },
    setDefaultCompressionMethod(state, action: PayloadAction<CompressionMethod>) {
      state.defaultCompressionMethod = action.payload;
      state.files.forEach((f) => { f.compressionMethod = action.payload; });
    },
    setCompressionEnabled(state, action: PayloadAction<boolean>) {
      state.compressionEnabled = action.payload;
      state.files.forEach((f) => { f.compressionEnabled = action.payload; });
    },
    setUploadProgress(state, action: PayloadAction<number>) {
      state.uploadProgress = action.payload;
    },
    setIsUploading(state, action: PayloadAction<boolean>) {
      state.isUploading = action.payload;
    },
    setStep(state, action: PayloadAction<number>) {
      state.step = action.payload;
    },
    resetUpload() {
      return initialState;
    },
  },
});

export const {
  addFiles,
  removeFile,
  updateFileName,
  updateFileCompression,
  toggleFileCompression,
  setCompanyName,
  setDefaultCompressionMethod,
  setCompressionEnabled,
  setUploadProgress,
  setIsUploading,
  setStep,
  resetUpload,
} = uploadSlice.actions;

export default uploadSlice.reducer;
