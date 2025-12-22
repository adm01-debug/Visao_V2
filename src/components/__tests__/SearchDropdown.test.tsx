import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import SearchDropdown from '../SearchDropdown';
const w = ({ children }: { children: React.ReactNode }) => (<QueryClientProvider client={new QueryClient()}><BrowserRouter>{children}</BrowserRouter></QueryClientProvider>);
describe('SearchDropdown', () => { it('renders', () => { render(<SearchDropdown />, { wrapper: w }); expect(document.body).toBeDefined(); }); });
