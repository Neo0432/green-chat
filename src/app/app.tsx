import { ChatPage } from '@pages/chat';
import { LoginPage } from '@pages/login';

import { selectIsSignedIn } from '@entities/session';

import { useAppSelector } from '@shared/lib/redux';

export const App = () => {
  const isSignedIn = useAppSelector(selectIsSignedIn);

  return isSignedIn ? <ChatPage /> : <LoginPage />;
};
