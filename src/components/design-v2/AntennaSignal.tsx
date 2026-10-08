import { useEffect, useRef, useState } from "react";

/** Antenna coordinates in the unmodified 1365 × 768 uploaded photograph. */
export function AntennaSignal() {
 const ref = useRef<SVGSVGElement>(null);
 const [geometry, setGeometry] = useState({ width: 1, height: 1, x: -100, y: -100, visible: false });
 useEffect(() => {
  const svg = ref.current;
  const picture = svg?.parentElement;
  const image = picture?.querySelector("img");
  if (!svg || !picture || !image) return;
  const update = () => {
   const width = picture.clientWidth, height = picture.clientHeight;
   if (!image.naturalWidth || !width || !height) return;
   const css = getComputedStyle(image);
   const scale = css.objectFit === "contain" ? Math.min(width / image.naturalWidth, height / image.naturalHeight) : Math.max(width / image.naturalWidth, height / image.naturalHeight);
   const [px, py] = css.objectPosition.split(" ").map(value => Number.parseFloat(value) / 100);
   const matrix = new DOMMatrixReadOnly(css.transform === "none" ? undefined : css.transform);
   const x = width / 2 + (1197 / 1365 * image.naturalWidth * scale + (width - image.naturalWidth * scale) * (px ?? .5) - width / 2) * matrix.a;
    const y = height / 2 + (164 / 768 * image.naturalHeight * scale + (height - image.naturalHeight * scale) * (py ?? .5) - height / 2) * matrix.d;
   setGeometry({ width, height, x, y, visible: x >= 0 && x <= width && y >= 0 && y <= height });
  };
  const observer = new ResizeObserver(update);
  observer.observe(picture);
  image.addEventListener("load", update);
  window.addEventListener("resize", update);
  update();
  return () => { observer.disconnect(); image.removeEventListener("load", update); window.removeEventListener("resize", update); };
 }, []);
 return <svg ref={ref} className="hero-antenna-signal" aria-hidden="true" focusable="false" viewBox={`0 0 ${geometry.width} ${geometry.height}`} data-visible={geometry.visible}>
  <g transform={`translate(${geometry.x} ${geometry.y})`}>
   <path className="antenna-signal-inner" d="M -8 -7 Q -14 0 -8 7" />
   <path className="antenna-signal-inner" d="M 8 -7 Q 14 0 8 7" />
   <path className="antenna-signal-outer" d="M -16 -11 Q -25 0 -16 11" />
   <path className="antenna-signal-outer" d="M 16 -11 Q 25 0 16 11" />
  </g>
 </svg>;
}
