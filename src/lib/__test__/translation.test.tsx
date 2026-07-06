import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TranslationProvider, useT } from '@/lib/translation';

function DisplayKey({ tKey }: { tKey: string }) {
  const t = useT();
  return <span>{t(tKey)}</span>;
}

describe('TranslationProvider / useT', () => {
  it('provides a t function that resolves keys', () => {
    const t = (key: string) => (key === 'hello' ? 'Hello World' : key);
    render(
      <TranslationProvider t={t}>
        <DisplayKey tKey="hello" />
      </TranslationProvider>,
    );
    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });

  it('falls back to the key when not found in the dict', () => {
    const t = (key: string) => key;
    render(
      <TranslationProvider t={t}>
        <DisplayKey tKey="unknownKey" />
      </TranslationProvider>,
    );
    expect(screen.getByText('unknownKey')).toBeInTheDocument();
  });

  it('throws when useT is called outside TranslationProvider', () => {
    const original = console.error;
    console.error = () => undefined;
    expect(() => render(<DisplayKey tKey="x" />)).toThrow(/TranslationProvider/);
    console.error = original;
  });
});
