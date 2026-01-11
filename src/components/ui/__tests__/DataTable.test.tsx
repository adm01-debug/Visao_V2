import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DataTable } from '../DataTable';

const mockData = [
  { id: 1, name: 'John', email: 'john@test.com', age: 30 },
  { id: 2, name: 'Jane', email: 'jane@test.com', age: 25 },
  { id: 3, name: 'Bob', email: 'bob@test.com', age: 35 },
];

const mockColumns = [
  { key: 'name', header: 'Name', sortable: true },
  { key: 'email', header: 'Email', sortable: true },
  { key: 'age', header: 'Age', sortable: true },
];

describe('DataTable', () => {
  describe('Rendering', () => {
    it('renders table with data', () => {
      render(<DataTable data={mockData} columns={mockColumns} />);
      
      expect(screen.getByText('John')).toBeInTheDocument();
      expect(screen.getByText('jane@test.com')).toBeInTheDocument();
    });

    it('renders column headers', () => {
      render(<DataTable data={mockData} columns={mockColumns} />);
      
      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('Age')).toBeInTheDocument();
    });

    it('renders empty state when no data', () => {
      render(<DataTable data={[]} columns={mockColumns} emptyMessage="No data available" />);
      
      expect(screen.getByText('No data available')).toBeInTheDocument();
    });

    it('renders loading state', () => {
      render(<DataTable data={[]} columns={mockColumns} isLoading />);
      
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });

  describe('Sorting', () => {
    it('sorts data when clicking sortable column', () => {
      const onSort = vi.fn();
      render(<DataTable data={mockData} columns={mockColumns} onSort={onSort} />);
      
      fireEvent.click(screen.getByText('Name'));
      
      expect(onSort).toHaveBeenCalledWith('name', 'asc');
    });

    it('toggles sort direction on second click', () => {
      const onSort = vi.fn();
      render(<DataTable data={mockData} columns={mockColumns} onSort={onSort} />);
      
      const nameHeader = screen.getByText('Name');
      fireEvent.click(nameHeader);
      fireEvent.click(nameHeader);
      
      expect(onSort).toHaveBeenLastCalledWith('name', 'desc');
    });
  });

  describe('Selection', () => {
    it('selects row on click when selectable', () => {
      const onSelect = vi.fn();
      render(<DataTable data={mockData} columns={mockColumns} selectable onSelect={onSelect} />);
      
      fireEvent.click(screen.getByText('John'));
      
      expect(onSelect).toHaveBeenCalledWith([mockData[0]]);
    });

    it('selects all rows with header checkbox', () => {
      const onSelect = vi.fn();
      render(<DataTable data={mockData} columns={mockColumns} selectable onSelect={onSelect} />);
      
      const selectAllCheckbox = screen.getByRole('checkbox', { name: /select all/i });
      fireEvent.click(selectAllCheckbox);
      
      expect(onSelect).toHaveBeenCalledWith(mockData);
    });
  });

  describe('Pagination', () => {
    it('shows pagination controls', () => {
      render(<DataTable data={mockData} columns={mockColumns} pagination pageSize={2} />);
      
      expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
    });

    it('navigates to next page', () => {
      const onPageChange = vi.fn();
      render(
        <DataTable 
          data={mockData} 
          columns={mockColumns} 
          pagination 
          pageSize={2} 
          onPageChange={onPageChange} 
        />
      );
      
      fireEvent.click(screen.getByRole('button', { name: /next/i }));
      
      expect(onPageChange).toHaveBeenCalledWith(2);
    });
  });

  describe('Filtering', () => {
    it('filters data based on search input', () => {
      render(<DataTable data={mockData} columns={mockColumns} filterable />);
      
      const searchInput = screen.getByPlaceholderText(/search/i);
      fireEvent.change(searchInput, { target: { value: 'John' } });
      
      expect(screen.getByText('John')).toBeInTheDocument();
      expect(screen.queryByText('Jane')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has correct table structure', () => {
      render(<DataTable data={mockData} columns={mockColumns} />);
      
      expect(screen.getByRole('table')).toBeInTheDocument();
      expect(screen.getAllByRole('columnheader')).toHaveLength(3);
      expect(screen.getAllByRole('row')).toHaveLength(4); // header + 3 data rows
    });
  });
});
