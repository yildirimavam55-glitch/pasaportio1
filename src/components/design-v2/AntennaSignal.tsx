import { useEffect, useRef, useState } from "react";

// Normalized coordinates measured from the 1672 × 941 source, not the hero box.
const ANTENNA = { x: 1197 / 1365, tip: 153 / 768, transmitter: 174 / 768 };

export function antennaCrop(width: number, height: number, naturalWidth: number, naturalHeight: number) {
 const scale = Math.max(width / naturalWidth, height / naturalHeight);
 const excess = naturalHeight * scale - height;
 return excess > 0 ? Math.max(0, Math.min(1, (ANTENNA.tip * naturalHeight * scale - 50) / excess)) : 0;
}

/** Crop and signal share the actual image scale, position and transform. */
export function AntennaSignal({ autoCrop = true }: { autoCrop?: boolean }) {
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
    if (autoCrop && window.matchMedia("(min-width:1024px)").matches) {
     const horizontal = getComputedStyle(image).objectPosition.split(" ")[0] ?? "50%";
     image.style.objectPosition = `${horizontal} ${antennaCrop(width, height, image.naturalWidth, image.naturalHeight) * 100}%`;
    } else image.style.removeProperty("object-position");
    const css = getComputedStyle(image);
   const scale = css.objectFit === "contain" ? Math.min(width / image.naturalWidth, height / image.naturalHeight) : Math.max(width / image.naturalWidth, height / image.naturalHeight);
   const [px, py] = css.objectPosition.split(" ").map(value => Number.parseFloat(value) / 100);
   const matrix = new DOMMatrixReadOnly(css.transform === "none" ? undefined : css.transform);
    const x = width / 2 + (ANTENNA.x * image.naturalWidth * scale + (width - image.naturalWidth * scale) * (px ?? .5) - width / 2) * matrix.a;
    const y = height / 2 + (ANTENNA.transmitter * image.naturalHeight * scale + (height - image.naturalHeight * scale) * (py ?? .5) - height / 2) * matrix.d;
    setGeometry({ width, height, x, y, visible: x >= 26 && x <= width - 26 && y >= 12 && y <= height - 12 });
  };
   if (typeof ResizeObserver === "undefined") return;
   const observer = new ResizeObserver(update);
  observer.observe(picture);
  image.addEventListener("load", update);
  window.addEventListener("resize", update);
  update();
  return () => { observer.disconnect(); image.removeEventListener("load", update); window.removeEventListener("resize", update); image.style.removeProperty("object-position"); };
 }, [autoCrop]);
 return <svg ref={ref} className="hero-antenna-signal" aria-hidden="true" focusable="false" viewBox={`0 0 ${geometry.width} ${geometry.height}`} data-visible={geometry.visible}>
  <g transform={`translate(${geometry.x} ${geometry.y})`}>
   <path className="antenna-signal-inner" d="M -8 -7 Q -14 0 -8 7" />
   <path className="antenna-signal-inner" d="M 8 -7 Q 14 0 8 7" />
   <path className="antenna-signal-outer" d="M -16 -11 Q -25 0 -16 11" />
   <path className="antenna-signal-outer" d="M 16 -11 Q 25 0 16 11" />
  </g>
 </svg>;
}
