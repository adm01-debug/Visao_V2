import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SettingsProvider, useSettings } from '../SettingsContext';

function TestComponent() {
  const { settings } = useSettings();
  return (
    <div>
      <span data-testid="language">{settings?.language ?? 'pt-BR'}</span>
    </div>
  );
}

describe('SettingsContext', () => {
  it('provides settings context', () => {
    render(
      <SettingsProvider>
        <TestComponent />
      </SettingsProvider>
    );
    expect(screen.getByTestId('language')).toBeInTheDocument();
  });

  it('initializes with default language', () => {
    render(
      <SettingsProvider>
        <TestComponent />
      </SettingsProvider>
    );
    expect(screen.getByTestId('language')).toHaveTextContent('pt-BR');
  });
});
