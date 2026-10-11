import type { CSSProperties } from "react";
import { sanitizeImageDisplay, type ImageDisplay } from "@/domain/storefront/image-display";
import photo from "@/assets/worldwide-window-photo.webp.asset.json";

/** Static photo using the existing CMS's responsive crop values. */
export function WorldwideBannerPhoto({ image, mobileImage, display, mobileDisplay }: {
  image?: string;
  mobileImage?: string;
  display?: ImageDisplay;
  mobileDisplay?: ImageDisplay;
}) {
  const desktop = sanitizeImageDisplay(display);
  const mobile = sanitizeImageDisplay(mobileDisplay, { ...desktop, x: display?.x ?? 76 });
  const crop = {
    "--worldwide-fit": desktop.fit,
    "--worldwide-position": `${desktop.x}% ${desktop.y}%`,
    "--worldwide-zoom": desktop.zoom / 100,
    "--worldwide-origin": `${desktop.x}% ${desktop.y}%`,
    "--worldwide-mobile-fit": mobile.fit,
    "--worldwide-mobile-position": `${mobile.x}% ${mobile.y}%`,
    "--worldwide-mobile-zoom": mobile.zoom / 100,
    "--worldwide-mobile-origin": `${mobile.x}% ${mobile.y}%`,
  } as CSSProperties;
  return <span className="home-worldwide-photo" style={crop} aria-hidden="true">
    <picture>
      {mobileImage && <source media="(max-width: 767px)" srcSet={mobileImage} />}
      <img src={image || photo.url} alt="" width={905} height={580} loading="lazy" decoding="async" />
    </picture>
  </span>;
}