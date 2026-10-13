export function decodeSpectrumFrame(buffer: ArrayBuffer): number[] {
  return Array.from(new Uint8Array(buffer), (byte) => byte / 255);
}
