import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { DataTable } from '../data-table';

describe('DataTable', () => {
  const columns = [
    { accessorKey: 'name', header: 'Name' },
    { accessorKey: 'email', header: 'Email' }
  ];
  const data = [
    { name: 'John', email: 'john@test.com' },
    { name: 'Jane', email: 'jane@test.com' }
  ];

  it('deve renderizar tabela', () => {
    render(<DataTable columns={columns} data={data} />);
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('deve exibir cabeçalhos', () => {
    render(<DataTable columns={columns} data={data} />);
    expect(screen.getByText('Name')).toBeInTheDocument();
  });

  it('deve exibir dados', () => {
    render(<DataTable columns={columns} data={data} />);
    expect(screen.getByText('John')).toBeInTheDocument();
  });
});
