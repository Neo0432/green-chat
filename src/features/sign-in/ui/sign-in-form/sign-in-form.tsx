import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';

import { selectForcedSignOut } from '@entities/session';

import { type Credentials, deriveApiUrl } from '@shared/api/green-api';
import { ENV } from '@shared/config';
import { useAppDispatch, useAppSelector } from '@shared/lib/redux';
import { Button } from '@shared/ui/button';
import { TextField } from '@shared/ui/text-field';

import { FORCED_SIGN_OUT_MESSAGE, getSignInErrorMessage } from '../../lib/get-sign-in-error-message';
import { signIn } from '../../model/sign-in';
import { type SignInFormValues, signInSchema } from '../../model/sign-in-schema';

import { getClasses } from './styles/get-classes';

const EXAMPLE_ID_INSTANCE = '4100000000';

export const SignInForm = () => {
  const dispatch = useAppDispatch();
  const forcedSignOut = useAppSelector(selectForcedSignOut);
  const [isApiUrlExpanded, setIsApiUrlExpanded] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    resetField,
    control,
    formState: { errors, isSubmitting },
  } = useForm<SignInFormValues, unknown, Credentials>({
    resolver: zodResolver(signInSchema),
    defaultValues: { idInstance: forcedSignOut?.idInstance ?? '', apiTokenInstance: '', apiUrl: '' },
  });
  const idInstance = useWatch({ control, name: 'idInstance' });
  const { cnRoot, cnToggle, cnError, cnNote } = getClasses();

  const rootError = errors.root?.message ?? (forcedSignOut ? FORCED_SIGN_OUT_MESSAGE : undefined);

  const handleValidSubmit = async (credentials: Credentials) => {
    const result = await dispatch(signIn(credentials)).unwrap();

    if (!result.ok) {
      setError('root', { message: getSignInErrorMessage(result.failure, credentials.apiUrl) });
    }
  };

  const handleToggleApiUrl = () => {
    if (isApiUrlExpanded) {
      resetField('apiUrl');
    }

    setIsApiUrlExpanded(!isApiUrlExpanded);
  };

  return (
    <form className={cnRoot} noValidate onSubmit={handleSubmit(handleValidSubmit)}>
      <TextField
        label="Instance ID"
        inputMode="numeric"
        autoComplete="username"
        disabled={isSubmitting}
        error={errors.idInstance?.message}
        {...register('idInstance')}
      />
      <TextField
        label="API token"
        type="password"
        autoComplete="current-password"
        disabled={isSubmitting}
        error={errors.apiTokenInstance?.message}
        {...register('apiTokenInstance')}
      />
      <button type="button" className={cnToggle} aria-expanded={isApiUrlExpanded} onClick={handleToggleApiUrl}>
        Custom API URL
      </button>
      {isApiUrlExpanded && (
        <TextField
          label="API URL"
          placeholder={deriveApiUrl(idInstance.trim() || EXAMPLE_ID_INSTANCE)}
          hint="Leave empty to use the address derived from the Instance ID."
          disabled={isSubmitting}
          error={errors.apiUrl?.message}
          {...register('apiUrl')}
        />
      )}
      <Button type="submit" isFullWidth isLoading={isSubmitting} loadingText="Please wait…">
        Sign in
      </Button>
      {rootError && (
        <p className={cnError} role="alert">
          {rootError}
        </p>
      )}
      {ENV.enableApiMocks && <p className={cnNote}>Mock mode: use 4100000001 / mock-token</p>}
    </form>
  );
};
