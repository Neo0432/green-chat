import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { Provider } from 'react-redux';

import { createAppStore } from '@app/store';

import { SignInForm } from '@features/sign-in';

import { ENV } from '@shared/config';
import { mockGreenApi } from '@shared/test/mock-green-api';
import { MOCK_TOKEN, PRIMARY_INSTANCE_ID } from '@shared/test/msw/green-api';
import { server } from '@shared/test/msw/server';

const renderForm = (preloadedState: Parameters<typeof createAppStore>[0] = {}) => {
  const store = createAppStore(preloadedState);

  render(
    <Provider store={store}>
      <SignInForm />
    </Provider>,
  );

  return { store, user: userEvent.setup() };
};

const fillAndSubmit = async (user: ReturnType<typeof userEvent.setup>, idInstance: string, apiToken: string) => {
  await user.type(screen.getByLabelText('Instance ID'), idInstance);
  await user.type(screen.getByLabelText('API token'), apiToken);
  await user.click(screen.getByRole('button', { name: 'Sign in' }));
};

const waitForSubmissionToSettle = () => screen.findByRole('button', { name: 'Sign in' });

describe('SignInForm', () => {
  beforeEach(() => {
    mockGreenApi();
  });

  it('has a password input for the token and the API URL behind a collapsed disclosure', async () => {
    const { user } = renderForm();

    expect(screen.getByLabelText('API token')).toHaveAttribute('type', 'password');
    expect(screen.queryByLabelText('API URL')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Custom API URL' }));

    expect(screen.getByRole('button', { name: 'Custom API URL' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByLabelText('API URL')).toHaveAttribute('placeholder', 'https://4100.api.green-api.com');

    await user.type(screen.getByLabelText('Instance ID'), '7103000001');

    expect(screen.getByLabelText('API URL')).toHaveAttribute('placeholder', 'https://7103.api.green-api.com');
  });

  it('shows the field errors and sends no request', async () => {
    const { user, store } = renderForm();

    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(screen.getByLabelText('Instance ID')).toHaveAccessibleDescription('Enter the Instance ID');
    expect(screen.getByLabelText('API token')).toHaveAccessibleDescription('Enter the API token');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(store.getState().session.credentials).toBeNull();

    await user.type(screen.getByLabelText('Instance ID'), 'abc');

    expect(screen.getByLabelText('Instance ID')).toHaveAccessibleDescription('Digits only, 4–20 characters');
  });

  it('shows an invalid API URL as a field error while the disclosure is expanded', async () => {
    const { user, store } = renderForm();
    await user.click(screen.getByRole('button', { name: 'Custom API URL' }));
    await user.type(screen.getByLabelText('API URL'), 'example.com');

    await fillAndSubmit(user, PRIMARY_INSTANCE_ID, MOCK_TOKEN);

    expect(screen.getByLabelText('API URL')).toHaveAccessibleDescription('Enter a valid https:// URL');
    expect(store.getState().session.credentials).toBeNull();
  });

  it('signs in with the URL derived from the Instance ID when the disclosure is collapsed again', async () => {
    const { user, store } = renderForm();
    await user.click(screen.getByRole('button', { name: 'Custom API URL' }));
    await user.type(screen.getByLabelText('API URL'), 'https://4101.api.green-api.com');
    await user.click(screen.getByRole('button', { name: 'Custom API URL' }));

    await fillAndSubmit(user, PRIMARY_INSTANCE_ID, MOCK_TOKEN);
    await waitForSubmissionToSettle();

    expect(store.getState().session.credentials).toEqual({
      idInstance: PRIMARY_INSTANCE_ID,
      apiTokenInstance: MOCK_TOKEN,
      apiUrl: 'https://4100.api.green-api.com',
    });
  });

  it('does not let an invalid API URL behind a collapsed disclosure block the sign-in', async () => {
    const { user, store } = renderForm();
    await user.click(screen.getByRole('button', { name: 'Custom API URL' }));
    await user.type(screen.getByLabelText('API URL'), 'example.com');
    await user.click(screen.getByRole('button', { name: 'Custom API URL' }));

    await fillAndSubmit(user, PRIMARY_INSTANCE_ID, MOCK_TOKEN);
    await waitForSubmissionToSettle();

    expect(store.getState().session.credentials).toMatchObject({ apiUrl: 'https://4100.api.green-api.com' });
    expect(screen.queryByLabelText('API URL')).not.toBeInTheDocument();
  });

  it('starts with an empty API URL when the disclosure is expanded again', async () => {
    const { user } = renderForm();
    await user.click(screen.getByRole('button', { name: 'Custom API URL' }));
    await user.type(screen.getByLabelText('API URL'), 'example.com');
    await user.click(screen.getByRole('button', { name: 'Custom API URL' }));

    await user.click(screen.getByRole('button', { name: 'Custom API URL' }));

    expect(screen.getByLabelText('API URL')).toHaveValue('');
  });

  it('disables the inputs and shows "Please wait…" until GREEN-API answers (FR-1.3)', async () => {
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    server.use(
      http.get('*/getStateInstance/*', async () => {
        await gate;

        return HttpResponse.json({ stateInstance: 'authorized' });
      }),
    );
    const { user, store } = renderForm();

    await fillAndSubmit(user, PRIMARY_INSTANCE_ID, MOCK_TOKEN);

    expect(screen.getByRole('button', { name: 'Please wait…' })).toBeDisabled();
    expect(screen.getByLabelText('Instance ID')).toBeDisabled();
    expect(screen.getByLabelText('API token')).toBeDisabled();

    release();
    await waitForSubmissionToSettle();

    expect(store.getState().session.credentials).toEqual({
      idInstance: PRIMARY_INSTANCE_ID,
      apiTokenInstance: MOCK_TOKEN,
      apiUrl: 'https://4100.api.green-api.com',
    });
  });

  it('keeps the values, token included, and shows the error as an alert when sign-in fails (AC-2)', async () => {
    const { user, store } = renderForm();

    await fillAndSubmit(user, PRIMARY_INSTANCE_ID, 'wrong');

    expect(await screen.findByRole('alert')).toHaveTextContent('Wrong API token.');
    expect(screen.getByLabelText('Instance ID')).toHaveValue(PRIMARY_INSTANCE_ID);
    expect(screen.getByLabelText('API token')).toHaveValue('wrong');
    expect(screen.getByLabelText('API token')).toBeEnabled();
    expect(store.getState().session.credentials).toBeNull();
  });

  it('shows the effective API URL when GREEN-API cannot be reached (AC-4)', async () => {
    const { user } = renderForm();

    await fillAndSubmit(user, '4100000009', MOCK_TOKEN);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Can't reach GREEN-API at https://4100.api.green-api.com.",
    );
  });

  it('pre-fills the Instance ID and says why after a forced sign-out (FR-1.9)', () => {
    renderForm({
      session: { credentials: null, instanceState: null, forcedSignOut: { idInstance: PRIMARY_INSTANCE_ID } },
    });

    expect(screen.getByLabelText('Instance ID')).toHaveValue(PRIMARY_INSTANCE_ID);
    expect(screen.getByLabelText('API token')).toHaveValue('');
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Your credentials were rejected by GREEN-API. Please sign in again.',
    );
  });

  it('shows the mock credentials hint in mock mode (MK-4)', () => {
    jest.replaceProperty(ENV, 'enableApiMocks', true);

    renderForm();

    expect(screen.getByText('Mock mode: use 4100000001 / mock-token')).toBeInTheDocument();
  });

  it('hides the mock credentials hint otherwise', () => {
    renderForm();

    expect(screen.queryByText(/Mock mode/)).not.toBeInTheDocument();
  });
});
