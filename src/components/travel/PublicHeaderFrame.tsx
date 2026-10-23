import type { ReactNode } from 'react';
import '@/components/design-v2/hero-reference.css';

/** Presentation only. Authentication, cart and picker handlers remain owned by PublicShell. */
export function PublicHeaderFrame({reference=false,brand,navigation,children}:{reference?:boolean;brand:ReactNode;navigation:ReactNode;children:ReactNode}) {
 return <header data-reference-hero-header={reference||undefined} className="sticky top-0 z-50 border-b border-border/60 bg-background/95 backdrop-blur-lg">
  <div className="public-header-row mx-auto grid min-h-14 max-w-site grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-3 sm:min-h-16 sm:gap-3 sm:px-6 lg:flex">
   {brand}{navigation}<div className="public-header-actions flex shrink-0 items-center gap-1 sm:gap-1.5">{children}</div>
  </div>
 </header>;
}
