import { useEffect, useRef, useState, type ReactNode } from 'react';
export function previewScale(available: number, requested: number): number {
  return Math.min(1, Math.max(1, available) / Math.max(1, requested));
}
/** Preserve the selected CSS viewport; scale the complete frame, never clip the right side. */
export function ResponsivePreview({ width, height=760, children }: {width:number;height?:number;children:(scale:number)=>ReactNode}) {
  const container=useRef<HTMLDivElement>(null);
  const [available,setAvailable]=useState(0);
  useEffect(()=>{
    const node=container.current;if(!node)return;
    const measure=()=>setAvailable(node.clientWidth);
    measure();const observer=new ResizeObserver(measure);observer.observe(node);
    return ()=>observer.disconnect();
  },[]);
  const scale=previewScale(available||Math.min(width,320),width);
  return <div ref={container} data-preview-container className="min-w-0 w-full" style={{maxWidth:'100%'}}><div data-preview-surface style={{width:Math.floor(width*scale),height,overflow:'hidden',marginInline:'auto'}}>{children(scale)}</div></div>;
}
