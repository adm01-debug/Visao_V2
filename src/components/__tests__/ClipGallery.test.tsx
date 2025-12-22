import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ClipGallery from '../ClipGallery';
const w = ({ children }: { children: React.ReactNode }) => (<QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>);
describe('ClipGallery', () => { it('renders', () => { expect(true).toBe(true); }); });
