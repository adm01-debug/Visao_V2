import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../command';

describe('Command', () => {
  const renderCommand = () => render(
    <Command>
      <CommandInput placeholder="Search..." />
      <CommandList>
        <CommandEmpty>No results</CommandEmpty>
        <CommandGroup heading="Suggestions">
          <CommandItem>Calendar</CommandItem>
          <CommandItem>Search</CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  );

  it('deve renderizar corretamente', () => {
    renderCommand();
    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
  });

  it('deve exibir itens', () => {
    renderCommand();
    expect(screen.getByText('Calendar')).toBeInTheDocument();
  });

  it('deve exibir heading', () => {
    renderCommand();
    expect(screen.getByText('Suggestions')).toBeInTheDocument();
  });
});
