import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Login from '.';

describe('<Login /> rendering', () => {
  it('should render without crashing', () => {
    const { container } = render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );
    expect(container).toBeTruthy();
  });
});
