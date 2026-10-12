import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { TextField } from '@shared/ui/text-field';

describe('TextField', () => {
  it('associates the label with the input', () => {
    render(<TextField label="Instance ID" />);

    expect(screen.getByLabelText('Instance ID')).toBe(screen.getByRole('textbox', { name: 'Instance ID' }));
  });

  it('gives every field its own id', () => {
    render(
      <>
        <TextField label="Instance ID" />
        <TextField label="API token" />
      </>,
    );

    expect(screen.getByLabelText('Instance ID').id).not.toBe(screen.getByLabelText('API token').id);
  });

  it('is not marked invalid without an error', () => {
    render(<TextField label="Instance ID" />);

    expect(screen.getByLabelText('Instance ID')).not.toHaveAttribute('aria-invalid');
    expect(screen.getByLabelText('Instance ID')).not.toHaveAccessibleDescription();
  });

  describe('with an error and no hint', () => {
    it('shows the error in the label slot and marks the input invalid', () => {
      render(<TextField label="Instance ID" error="Invalid Instance ID" />);

      const input = screen.getByRole('textbox');

      expect(screen.getByText('Invalid Instance ID')).toBeVisible();
      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(input).toHaveAccessibleDescription('Invalid Instance ID');
    });

    it('keeps the label as the accessible name', () => {
      render(<TextField label="Instance ID" error="Invalid Instance ID" />);

      expect(screen.getByRole('textbox', { name: 'Instance ID' })).toBeInTheDocument();
    });

    it('announces an error that appears later through a live region that was already mounted', () => {
      const { rerender } = render(<TextField label="Instance ID" />);

      rerender(<TextField label="Instance ID" error="Invalid Instance ID" />);

      const region = screen.getByText('Invalid Instance ID');

      expect(region).toHaveAttribute('aria-live', 'polite');

      rerender(<TextField label="Instance ID" />);

      expect(region).toBeInTheDocument();
      expect(region).toBeEmptyDOMElement();
      expect(screen.getByLabelText('Instance ID')).not.toHaveAccessibleDescription();
    });
  });

  describe('with a hint', () => {
    it('describes the input with the hint', () => {
      render(<TextField label="Phone number" hint="Use the international format" />);

      expect(screen.getByLabelText('Phone number')).toHaveAccessibleDescription('Use the international format');
    });

    it('shows the error instead of the hint and keeps the label', () => {
      render(
        <TextField label="Phone number" error="This number isn't on Telegram" hint="Use the international format" />,
      );

      expect(screen.getByText("This number isn't on Telegram")).toBeVisible();
      expect(screen.queryByText('Use the international format')).not.toBeInTheDocument();
      expect(screen.getByText('Phone number')).toBeVisible();
    });

    it('describes the input with the error alone and marks it invalid', () => {
      render(
        <TextField label="Phone number" error="This number isn't on Telegram" hint="Use the international format" />,
      );

      const input = screen.getByRole('textbox', { name: 'Phone number' });

      expect(input).toHaveAccessibleDescription("This number isn't on Telegram");
      expect(input).toHaveAttribute('aria-invalid', 'true');
    });

    it('announces the error through the hint element, which stays mounted', () => {
      const { rerender } = render(<TextField label="Phone number" hint="Use the international format" />);

      const hint = screen.getByText('Use the international format');

      rerender(<TextField label="Phone number" error="Too short" hint="Use the international format" />);

      expect(screen.getByText('Too short')).toBe(hint);
      expect(hint).toHaveAttribute('aria-live', 'polite');

      rerender(<TextField label="Phone number" hint="Use the international format" />);

      expect(screen.getByText('Use the international format')).toBe(hint);
    });
  });

  it('merges a consumer aria-describedby with the error', () => {
    render(
      <>
        <p id="form-error">Form error</p>
        <TextField label="Instance ID" error="Invalid Instance ID" aria-describedby="form-error" />
      </>,
    );

    expect(screen.getByLabelText('Instance ID')).toHaveAccessibleDescription('Form error Invalid Instance ID');
  });

  it('keeps a consumer aria-describedby when there is no error or hint', () => {
    render(
      <>
        <p id="form-error">Form error</p>
        <TextField label="Instance ID" aria-describedby="form-error" />
      </>,
    );

    expect(screen.getByLabelText('Instance ID')).toHaveAccessibleDescription('Form error');
  });

  it('reports typed text through onChange', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();

    render(<TextField label="Instance ID" name="idInstance" onChange={onChange} />);

    await user.type(screen.getByLabelText('Instance ID'), '4100');

    expect(screen.getByLabelText('Instance ID')).toHaveValue('4100');
    expect(onChange).toHaveBeenCalledTimes(4);
  });

  it('reports blur through onBlur', async () => {
    const user = userEvent.setup();
    const onBlur = jest.fn();

    render(<TextField label="Instance ID" onBlur={onBlur} />);

    await user.click(screen.getByLabelText('Instance ID'));
    await user.tab();

    expect(onBlur).toHaveBeenCalledTimes(1);
  });

  it('forwards the ref and the name to the input, as react-hook-form needs', () => {
    const ref = createRef<HTMLInputElement>();

    render(<TextField ref={ref} label="Instance ID" name="idInstance" />);

    expect(ref.current).toBe(screen.getByLabelText('Instance ID'));
    expect(screen.getByLabelText('Instance ID')).toHaveAttribute('name', 'idInstance');
  });

  it('passes the input type through', () => {
    render(<TextField label="API token" type="password" />);

    expect(screen.getByLabelText('API token')).toHaveAttribute('type', 'password');
  });

  it('passes native input attributes through', () => {
    render(<TextField label="Instance ID" inputMode="numeric" autoComplete="username" />);

    expect(screen.getByLabelText('Instance ID')).toHaveAttribute('inputmode', 'numeric');
    expect(screen.getByLabelText('Instance ID')).toHaveAttribute('autocomplete', 'username');
  });

  it('keeps a given placeholder', () => {
    render(<TextField label="API URL" placeholder="https://4100.api.green-api.com" />);

    expect(screen.getByLabelText('API URL')).toHaveAttribute('placeholder', 'https://4100.api.green-api.com');
  });

  it('does not accept typing when disabled', async () => {
    const user = userEvent.setup();

    render(<TextField label="Instance ID" disabled />);

    await user.type(screen.getByLabelText('Instance ID'), '4100');

    expect(screen.getByLabelText('Instance ID')).toBeDisabled();
    expect(screen.getByLabelText('Instance ID')).toHaveValue('');
  });
});
