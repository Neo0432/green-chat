import type { AppStore } from './store';

/** Global, so the layers below `app` can type their hooks and thunks without importing from it. */
declare global {
  type RootState = ReturnType<AppStore['getState']>;
  type AppDispatch = AppStore['dispatch'];
}
