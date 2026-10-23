import { useEffect, useRef, type ReactNode } from 'react';
import { Menu, X, ExternalLink } from 'lucide-react';
import './admin-workspace.css';

/** Presentation only: AdminGate remains responsible for authentication and all data access. */
export function AdminWorkspaceShell({ title, navigation, actions, children, mobileOpen, onMobileOpen, brand = 'Pasaport.io' }: {
  title: string; navigation: ReactNode; actions?: ReactNode; children: ReactNode;
  mobileOpen: boolean; onMobileOpen: (open: boolean) => void; brand?: string;
}) {
  const trigger = useRef<HTMLButtonElement>(null);
  const drawer = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!mobileOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    drawer.current?.querySelector<HTMLButtonElement>('button')?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onMobileOpen(false);
      if (event.key !== 'Tab' || !drawer.current) return;
      const nodes = [...drawer.current.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),summary')].filter(el => el.getClientRects().length);
      const first = nodes[0], last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', key);
    return () => { document.body.style.overflow = previous; document.removeEventListener('keydown', key); trigger.current?.focus(); };
  }, [mobileOpen, onMobileOpen]);
  return <div className="admin-shell admin-reference-shell">
    {mobileOpen && <button className="admin-drawer-backdrop" aria-label="Menüyü kapat" onClick={() => onMobileOpen(false)} />}
    <aside ref={drawer} className={`admin-reference-sidebar ${mobileOpen ? 'is-open' : ''}`} aria-label="Yönetim bölümleri" {...(mobileOpen ? { role: 'dialog', 'aria-modal': true } as const : {})}>
      <div className="admin-reference-brand"><a href="/admin">{brand} <small>ADMIN</small></a><button onClick={() => onMobileOpen(false)} aria-label="Yönetim menüsünü kapat"><X size={20}/></button></div>
      <nav aria-label="Yönetim navigasyonu">{navigation}</nav>
      <a className="admin-reference-store" href="/esim" target="_blank" rel="noreferrer"><ExternalLink size={18}/>Mağazayı görüntüle</a>
    </aside>
    <main className="admin-reference-main"><header className="admin-reference-header"><button ref={trigger} className="admin-menu-toggle" onClick={() => onMobileOpen(true)} aria-label="Yönetim menüsünü aç" aria-expanded={mobileOpen}><Menu size={22}/></button><div><small>İŞ KONTROL MERKEZİ</small><h1>{title}</h1></div>{actions}</header><div className="admin-reference-content">{children}</div></main>
  </div>;
}
