import { createContext, forwardRef, useContext, type ComponentProps } from "react";
import { Link, useNavigate } from "@tanstack/react-router";

/**
 * Presentation switch for the V2 design preview.
 * Default is `false` → every shared customer component behaves exactly like production.
 * Only the isolated /design-v2 routes provide `true`.
 */
export const V2Context = createContext(false);
export const useIsV2 = () => useContext(V2Context);

/** Maps a production customer path to its V2 preview twin. Unknown paths are returned unchanged. */
export function toV2Path(path: string): string {
  if (path === "/" || path === "/esim" || path.startsWith("/esim/")) return "/design-v2/esim";
  if (path === "/lounge" || path.startsWith("/lounge/")) return "/design-v2/lounge";
  if (path === "/sepet") return "/design-v2/cart";
  if (path === "/destek") return "/design-v2/support";
  if (path === "/auth") return "/design-v2/auth/login";
  if (path === "/account" || path.startsWith("/account/")) return `/design-v2${path}`;
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
  if (!v2) return <Link ref={ref} {...(props as LinkProps)} />;
  const { to, search, hash, ...rest } = props;
  const mapped = typeof to === "string" ? toV2Path(to) : to;
  const changed = mapped !== to;
  const dropQuery = changed && (to === "/" || to === "/esim" || to === "/lounge");
  return (
    <Link
      ref={ref}
      {...(rest as LinkProps)}
      to={mapped as never}
      {...((dropQuery ? {} : { search, hash }) as object)}
    />
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
