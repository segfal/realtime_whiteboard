import { configureStore } from '@reduxjs/toolkit';
import whiteboardReducer from './whiteboardSlice';
import { websocketMiddleware } from './websocketMiddleware';

export const store = configureStore({
  reducer: {
    whiteboard: whiteboardReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore WebSocket instance in state
        ignoredPaths: ['websocket'],
        ignoredActions: ['websocket/connected', 'websocket/disconnected'],
      },
    }).concat(websocketMiddleware),
  devTools: process.env.NODE_ENV !== 'production',
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;