import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '../input-otp';

describe('InputOTP', () => {
  it('deve renderizar corretamente', () => {
    render(
      <InputOTP maxLength={6}>
        <InputOTPGroup>
          <InputOTPSlot index={0} />
          <InputOTPSlot index={1} />
          <InputOTPSlot index={2} />
        </InputOTPGroup>
      </InputOTP>
    );
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('deve aceitar maxLength', () => {
    render(<InputOTP maxLength={4}><InputOTPGroup><InputOTPSlot index={0} /></InputOTPGroup></InputOTP>);
    expect(screen.getByRole('textbox')).toHaveAttribute('maxLength', '4');
  });
});
