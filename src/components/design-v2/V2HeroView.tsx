import type { CSSProperties, ReactNode } from "react";
import type { V2Section } from "@/domain/storefront/v2";
import { heroMedia } from "@/domain/storefront/hero-presentation";
import fallbackHeroDesktop from "@/assets/pasaport-final-coast.jpg";
import fallbackHeroMobile from "@/assets/pasaport-final-coast-mobile.jpg";
import { AntennaSignal } from "./AntennaSignal";

/** The actual storefront Hero, without data fetching; editor demo and production share this DOM. */
export function V2HeroView({ section, image, tabletImage, mobileImage, heading, subtitle, promotion, trust, children }: {
  section: V2Section; image: string; tabletImage?: string | undefined; mobileImage?: string | undefined;
  heading: ReactNode; subtitle: string; promotion?: ReactNode; trust?: ReactNode; children: ReactNode;
}) {
  const media = heroMedia(section, { desktop: image, tablet: tabletImage, mobile: mobileImage }, { desktop: fallbackHeroDesktop, mobile: fallbackHeroMobile });
  const desktop = media.desktopCrop, mobile = media.mobileCrop, tablet = media.tabletCrop;
  const style = {
    "--hero-desktop-position": desktop ? `${desktop.x}% ${desktop.y}%` : "50% calc(50px - 11.2113vw)",
    "--hero-desktop-scale": (desktop?.zoom ?? 100) / 100, "--hero-desktop-fit": desktop?.fit ?? "cover",
    "--hero-mobile-position": `${mobile?.x ?? 88}% ${mobile?.y ?? 62}%`, "--hero-mobile-scale": (mobile?.zoom ?? 100) / 100, "--hero-mobile-fit": mobile?.fit ?? "cover",
    "--hero-tablet-position": `${tablet?.x ?? 88}% ${tablet?.y ?? 62}%`, "--hero-tablet-scale": (tablet?.zoom ?? 100) / 100, "--hero-tablet-fit": tablet?.fit ?? "cover",
  } as CSSProperties;
  return <section data-testid="pasaport-esim-hero" className="pasaport-final-hero" style={style} data-has-trust-strip="true">
    <picture className="final-hero-photo">
      <source media="(min-width:1024px)" srcSet={media.desktop} />
      {tabletImage && <source media="(min-width:640px)" srcSet={media.tablet} />}
      <img src={media.mobile} alt="" width={1672} height={941} fetchPriority="high" loading="eager" decoding="async" onError={event => {
        const picture = event.currentTarget.parentElement;
        picture?.querySelectorAll("source").forEach(source => source.remove());
        const fallback = window.matchMedia("(min-width:1024px)").matches ? fallbackHeroDesktop : fallbackHeroMobile;
        if (event.currentTarget.src !== new URL(fallback, window.location.origin).href) event.currentTarget.src = fallback;
      }} />
      {media.signal && <AntennaSignal autoCrop={!media.desktopCrop} />}
    </picture>
    <div className="final-hero-shade" aria-hidden="true" />
    <div className="final-hero-heading"><h1>{heading}</h1><p>{subtitle}</p></div>
    <div className="final-hero-search">{children}</div>
    <div className="final-hero-gift">{promotion}</div>
    <div className="final-hero-trust">{trust}</div>
  </section>;
}
