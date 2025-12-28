import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ToggleGroup, ToggleGroupItem } from '../toggle-group';

describe('ToggleGroup', () => {
  it('deve renderizar corretamente', () => {
    render(
      <ToggleGroup type="single">
        <ToggleGroupItem value="a">A</ToggleGroupItem>
        <ToggleGroupItem value="b">B</ToggleGroupItem>
      </ToggleGroup>
    );
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
  });

  it('deve selecionar item ao clicar', () => {
    render(
      <ToggleGroup type="single">
        <ToggleGroupItem value="a">A</ToggleGroupItem>
        <ToggleGroupItem value="b">B</ToggleGroupItem>
      </ToggleGroup>
    );
    fireEvent.click(screen.getByText('A'));
    expect(screen.getByText('A')).toHaveAttribute('data-state', 'on');
  });

  it('deve aceitar type multiple', () => {
    render(
      <ToggleGroup type="multiple">
        <ToggleGroupItem value="a">A</ToggleGroupItem>
        <ToggleGroupItem value="b">B</ToggleGroupItem>
      </ToggleGroup>
    );
    fireEvent.click(screen.getByText('A'));
    fireEvent.click(screen.getByText('B'));
    expect(screen.getByText('A')).toHaveAttribute('data-state', 'on');
    expect(screen.getByText('B')).toHaveAttribute('data-state', 'on');
  });

  it('deve disparar onValueChange', () => {
    const onChange = vi.fn();
    render(
      <ToggleGroup type="single" onValueChange={onChange}>
        <ToggleGroupItem value="a">A</ToggleGroupItem>
      </ToggleGroup>
    );
    fireEvent.click(screen.getByText('A'));
    expect(onChange).toHaveBeenCalledWith('a');
  });
});
