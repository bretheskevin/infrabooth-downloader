import { RADIAL_ARTWORK_RATIO } from '../renderers/radial';

export default function RadialArtwork({ src }: { src: string }) {
  const size = `calc(min(100vw, 100dvh) * ${RADIAL_ARTWORK_RATIO})`;
  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      style={{ width: size, height: size }}
      className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full object-cover shadow-2xl"
    />
  );
}
