// shapes.js — SVG cursor shapes with hotspot offsets (hx, hy).

const ARROW_D =
  "M4,0 L4,16 L7,13 L10,19 L12,18 L9,12 L13,12 Z";

export const SHAPES = {
  arrow: (c) => ({
    hx: 5, hy: 4,
    svg: `<path d="${ARROW_D}" fill="${c}" stroke="#fff" stroke-width="1.2" stroke-linejoin="round"/>`,
  }),
  cross: (c) => ({
    hx: 11, hy: 11,
    svg: `<g>
      <line x1="11" y1="2"  x2="11" y2="20" stroke="#fff" stroke-width="3"/>
      <line x1="2"  y1="11" x2="20" y2="11" stroke="#fff" stroke-width="3"/>
      <line x1="11" y1="2"  x2="11" y2="20" stroke="${c}" stroke-width="1.5"/>
      <line x1="2"  y1="11" x2="20" y2="11" stroke="${c}" stroke-width="1.5"/>
    </g>`,
  }),
  ibeam: (c) => ({
    hx: 11, hy: 11,
    svg: `<g>
      <line x1="11" y1="3"  x2="11" y2="19" stroke="#fff" stroke-width="2.5"/>
      <line x1="8"  y1="3"  x2="14" y2="3"  stroke="#fff" stroke-width="2.5"/>
      <line x1="8"  y1="19" x2="14" y2="19" stroke="#fff" stroke-width="2.5"/>
      <line x1="11" y1="3"  x2="11" y2="19" stroke="${c}" stroke-width="1.5"/>
      <line x1="8"  y1="3"  x2="14" y2="3"  stroke="${c}" stroke-width="1.5"/>
      <line x1="8"  y1="19" x2="14" y2="19" stroke="${c}" stroke-width="1.5"/>
    </g>`,
  }),
};

export function makeCursorSVG(shape, color) {
  const { hx, hy, svg } = SHAPES[shape](color);
  return {
    hx, hy,
    dataUrl: `data:image/svg+xml,${encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22">${svg}</svg>`
    )}`,
  };
}
