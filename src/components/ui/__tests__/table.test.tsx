import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../table';

describe('Table', () => {
  const renderTable = () => render(
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell>John</TableCell>
          <TableCell>john@email.com</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );

  it('deve renderizar tabela', () => {
    renderTable();
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('deve exibir cabeçalhos', () => {
    renderTable();
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
  });

  it('deve exibir dados', () => {
    renderTable();
    expect(screen.getByText('John')).toBeInTheDocument();
    expect(screen.getByText('john@email.com')).toBeInTheDocument();
  });
});
