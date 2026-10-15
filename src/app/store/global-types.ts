import type { AppStore } from './store';

declare global {
  type RootState = ReturnType<AppStore['getState']>;
  type AppDispatch = AppStore['dispatch'];
}
