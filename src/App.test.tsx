import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@/lib/i18n';
import { App } from './App';

describe('App', () => {
  it('should render the app title', () => {
    render(<App />);
    expect(screen.getByText('InfraBooth Downloader')).toBeDefined();
  });

  it('should render the welcome message', () => {
    render(<App />);
    expect(screen.getByText('Welcome to InfraBooth Downloader')).toBeDefined();
  });
});
