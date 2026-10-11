import { useEffect, useRef, useState } from "react";
import earth from "@/assets/earth-final.mp4.asset.json";
import poster from "@/assets/earth-final-poster.webp.asset.json";

/** Native decoding avoids a runtime 3D renderer. */
export function WorldwideEarth() {
  const root = useRef<HTMLSpanElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [near, setNear] = useState(false);
  const [visible, setVisible] = useState(false);
  const [reduced, setReduced] = useState(true);
  const [pageVisible, setPageVisible] = useState(true);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const node = root.current;
    if (!node) return;
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const syncMotion = () => setReduced(motion.matches);
    const syncPage = () => setPageVisible(!document.hidden);
    syncMotion(); syncPage();
    motion.addEventListener("change", syncMotion);
    document.addEventListener("visibilitychange", syncPage);
    const preparation = new IntersectionObserver(([entry]) => { if (entry?.isIntersecting) { setNear(true); preparation.disconnect(); } }, { rootMargin: "120px" });
    const visibility = new IntersectionObserver(([entry]) => setVisible(Boolean(entry?.isIntersecting)), { threshold: .05 });
    preparation.observe(node); visibility.observe(node);
    return () => { preparation.disconnect(); visibility.disconnect(); motion.removeEventListener("change", syncMotion); document.removeEventListener("visibilitychange", syncPage); };
  }, []);
  useEffect(() => {
    const node = video.current;
    if (!node) return;
    if (visible && pageVisible && !reduced) void node.play().catch(() => setFailed(true));
    else node.pause();
  }, [near, visible, pageVisible, reduced]);
  return <span ref={root} className="home-worldwide-earth" aria-hidden="true">
    <img src={poster.url} alt="" width={384} height={384} loading="lazy" decoding="async" />
    {near && !reduced && !failed && <video ref={video} src={earth.url} poster={poster.url} width={320} height={320} muted loop playsInline preload="none" disablePictureInPicture onError={() => setFailed(true)} />}
  </span>;
}
