import { createContext, forwardRef, useContext, type ComponentProps } from "react";
import { Link, useNavigate } from "@tanstack/react-router";

/**
 * Presentation switch for the V2 design preview.
 * V2 is the primary storefront → default `true`. Only the admin-only /legacy-v1 area provides `false`.
 */
export const V2Context = createContext(true);
export const useIsV2 = () => useContext(V2Context);

/** Maps a production customer path to its V2 preview twin. Unknown paths are returned unchanged. */
export function toV2Path(path: string): string {
  // V2 is the primary storefront: public paths ARE the V2 pages. Only retired V1-only paths are mapped.
  if (path === "/esim/ulkeler" || path === "/esim/paketler") return "/esim";
  if (path === "/lounge/secenekler") return "/lounge";
  return path;
}

type LinkProps = ComponentProps<typeof Link>;
type CLinkProps = Omit<LinkProps, "to" | "params" | "search" | "hash"> & {
  to?: string;
  params?: Record<string, string>;
  search?: Record<string, unknown>;
  hash?: string;
};

/**
 * Drop-in replacement for TanStack `Link`. Outside V2 it renders the original link untouched.
 * Inside V2 it rewrites customer paths to the preview twins so the journey never leaves V2.
 */
export const CLink = forwardRef<HTMLAnchorElement, CLinkProps>(function CLink(props, ref) {
  const v2 = useIsV2();
  // Untyped view of Link: paths here are dynamic strings mapped at runtime.
  const L = Link as unknown as (p: Record<string, unknown>) => ReturnType<typeof Link>;
  if (!v2) return <L ref={ref} {...props} />;
  const { to, search, hash, ...rest } = props;
  const service = (search as { service?: string } | undefined)?.service;
  const mapped = to === "/" && (service === "lounge" || service === "esim") ? `/${service}` : typeof to === "string" ? toV2Path(to) : to;
  const changed = mapped !== to;
  const dropQuery = changed && (to === "/" || to === "/esim/ulkeler" || to === "/esim/paketler" || to === "/lounge/secenekler");
  return (
    <L ref={ref} {...rest} to={mapped} {...(dropQuery ? {} : { search, hash })} />
  );
});

/** navigate() that respects the V2 preview mapping. */
export function useCustomerNavigate() {
  const v2 = useIsV2();
  const navigate = useNavigate();
  return (opts: { to: string; search?: Record<string, unknown>; replace?: boolean }) => {
    if (!v2) return navigate(opts as never);
    const to = toV2Path(opts.to);
    return navigate({ to, replace: opts.replace } as never);
  };
}
