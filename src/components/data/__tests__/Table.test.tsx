import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Table } from '../Table';

describe('Table', () => {
  const columns = [
    { key: 'name' as const, header: 'Name' },
    { key: 'age' as const, header: 'Age' },
  ];

  const data = [
    { name: 'John', age: 30 },
    { name: 'Jane', age: 25 },
  ];

  it('renders headers', () => {
    render(<Table columns={columns} data={data} />);

    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Age')).toBeInTheDocument();
  });

  it('renders data rows', () => {
    render(<Table columns={columns} data={data} />);

    expect(screen.getByText('John')).toBeInTheDocument();
    expect(screen.getByText('30')).toBeInTheDocument();
  });

  it('renders empty message when no data', () => {
    render(<Table columns={columns} data={[]} />);

    expect(screen.getByText('Nenhum dado encontrado')).toBeInTheDocument();
  });

  it('renders custom empty message', () => {
    render(<Table columns={columns} data={[]} emptyMessage="No results" />);

    expect(screen.getByText('No results')).toBeInTheDocument();
  });
});
