import React from 'react';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Router from '.';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

describe('<Router /> rendering', () => {
  it('should render without crashing', () => {
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Router />
        </BrowserRouter>
      </QueryClientProvider>
    );
    expect(container).toBeTruthy();
  });
});
