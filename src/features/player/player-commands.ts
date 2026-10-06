import type { ErrorResponse, Result } from '@/bindings';
import { logger } from '@/lib/logger';

let chain: Promise<void> = Promise.resolve();

export function sendPlayerCommand(name: string, call: () => Promise<Result<null, ErrorResponse>>): void {
  chain = chain.then(async () => {
    try {
      const result = await call();
      if (result.status === 'error') {
        void logger.error(`[player-commands] ${name} failed: ${result.error.code} ${result.error.message}`);
      }
    } catch (e) {
      void logger.error(`[player-commands] ${name} threw: ${String(e)}`);
    }
  });
}

export function flushPlayerCommands(): Promise<void> {
  return chain;
}
