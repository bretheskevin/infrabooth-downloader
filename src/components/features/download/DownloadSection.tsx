import { useCallback } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { UrlInput } from './UrlInput';
import { AuthPrompt } from './AuthPrompt';

export function DownloadSection() {
  const isSignedIn = useAuthStore((state) => state.isSignedIn);

  const handleUrlChange = useCallback((_newUrl: string) => {
    // Validation will be added in Story 3.2
  }, []);

  return (
    <section className="space-y-4">
      <div className="relative">
        <UrlInput
          onUrlChange={handleUrlChange}
          disabled={!isSignedIn}
        />
        {!isSignedIn && <AuthPrompt />}
      </div>
      {/* Preview and progress will be added in later stories */}
    </section>
  );
}
