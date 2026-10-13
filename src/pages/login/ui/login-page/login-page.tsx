import { SignInForm } from '@features/sign-in';

import { SvgLogo } from '@shared/assets/icons';

import { getClasses } from './styles/get-classes';

export const LoginPage = () => {
  const { cnRoot, cnContent, cnLogo, cnTitle, cnSubtitle } = getClasses();

  return (
    <main className={cnRoot}>
      <div className={cnContent}>
        <div className={cnLogo}>
          <SvgLogo width={80} height={80} />
        </div>
        <h1 className={cnTitle}>Sign in to green-chat</h1>
        <p className={cnSubtitle}>
          Enter the credentials of your GREEN-API Telegram instance. You can find them in console.green-api.com.
        </p>
        <SignInForm />
      </div>
    </main>
  );
};
