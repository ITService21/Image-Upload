import { configureStore } from '@reduxjs/toolkit';
import mediaReducer from './mediaSlice';
import uploadReducer from './uploadSlice';

export const store = configureStore({
  reducer: {
    media: mediaReducer,
    upload: uploadReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ serializableCheck: false }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
