import { vi } from 'vitest';
import { act } from '@testing-library/react';

export function enableFullscreen() {
  Object.defineProperty(document, 'fullscreenEnabled', { value: true, configurable: true });
}

export function mockFullscreenMethods() {
  const request = vi.fn(() => Promise.resolve());
  const exit = vi.fn(() => Promise.resolve());
  document.documentElement.requestFullscreen = request;
  document.exitFullscreen = exit;
  return { request, exit };
}

export function mockSupportedFullscreen() {
  enableFullscreen();
  return mockFullscreenMethods();
}

export function setFullscreenElement(element: Element | null) {
  Object.defineProperty(document, 'fullscreenElement', { value: element, configurable: true });
}

export function changeFullscreenElement(element: Element | null) {
  act(() => {
    setFullscreenElement(element);
    document.dispatchEvent(new Event('fullscreenchange'));
  });
}

export function resetFullscreen() {
  Reflect.deleteProperty(document, 'fullscreenEnabled');
  Reflect.deleteProperty(document, 'fullscreenElement');
  Reflect.deleteProperty(document, 'exitFullscreen');
  Reflect.deleteProperty(document.documentElement, 'requestFullscreen');
}

export function setStandalone(standalone: boolean) {
  Object.defineProperty(navigator, 'standalone', { value: standalone, configurable: true });
}

export function resetStandalone() {
  Reflect.deleteProperty(navigator, 'standalone');
}
