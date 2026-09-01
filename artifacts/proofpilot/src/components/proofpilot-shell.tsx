import { Link, useLocation } from 'wouter';
import { Activity, ArrowUpRight, Boxes, ChevronDown, CircleHelp, Command, FileText, LayoutGrid, Plus, Radar, Settings2, ShieldCheck, Sparkles } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { isWebMcpAvailable } from '@/lib/webmcp';

interface ShellProps {
  children: ReactNode;
  decisionTitle?: string;
  onNewDecision?: () => void;
}

const navItems = [
  { href: '/decisions/demo-ai-assistant', label: 'Workspace', icon: LayoutGrid },
  { href: '/decisions', label: 'Decisions', icon: Boxes },
  { href: '/activity', label: 'Activity', icon: Activity },
  { href: '/brief', label: 'Decision brief', icon: FileText },
  { href: '/developer', label: 'Developer', icon: Command },
];

export function ProofPilotShell({ children, decisionTitle = 'AI coding assistant', onNewDecision }: ShellProps) {
  const [location] = useLocation();
  const [, setLocation] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [webmcpReady, setWebmcpReady] = useState(isWebMcpAvailable);
  useEffect(() => {
    const syncStatus = () => setWebmcpReady(isWebMcpAvailable());
    window.addEventListener('proofpilot:webmcp-ready', syncStatus);
    syncStatus();
    return () => window.removeEventListener('proofpilot:webmcp-ready', syncStatus);
  }, []);
  return (
    <div className="noise min-h-[100dvh] bg-background">
      <aside className={cn('fixed inset-y-0 left-0 z-40 flex w-[252px] flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-transform duration-300 md:translate-x-0', mobileOpen ? 'translate-x-0' : '-translate-x-full')}>
        <div className="flex h-[76px] items-center gap-3 border-b border-sidebar-border px-6">
          <div className="relative flex h-8 w-8 items-center justify-center rounded-[10px] bg-sidebar-primary text-sidebar-primary-foreground">
            <Radar size={17} strokeWidth={2.5} />
            <span className="signal-pulse absolute -right-1 -top-1 h-2 w-2 rounded-full bg-[#5cb7a9]" />
          </div>
          <div>
            <div className="font-display text-[17px] font-semibold tracking-[-.03em]">ProofPilot</div>
            <div className="font-mono text-[9px] uppercase tracking-[.19em] text-sidebar-foreground/50">judgment workspace</div>
          </div>
        </div>
        <div className="px-4 pt-6">
          <button type="button" data-testid="button-new-decision-sidebar" onClick={() => onNewDecision ? onNewDecision() : setLocation('/decisions?new=1')} className="group flex w-full items-center justify-between rounded-lg border border-sidebar-primary/35 bg-sidebar-primary/10 px-3 py-2.5 text-left text-[12px] font-semibold text-sidebar-primary transition hover:bg-sidebar-primary/15">
            <span className="flex items-center gap-2"><Plus size={15} /> New decision</span>
            <span className="font-mono text-[9px] text-sidebar-primary/60">⌘ N</span>
          </button>
        </div>
        <nav className="mt-6 flex-1 px-3" aria-label="Primary navigation">
          <div className="mb-2 px-3 font-mono text-[9px] uppercase tracking-[.18em] text-sidebar-foreground/35">Navigate</div>
          <div className="space-y-1">
            {navItems.map(({ href, label, icon: Icon }) => {
              const active = href === '/' ? location === '/' : location.startsWith(href);
              return <Link key={href} href={href} data-testid={`link-nav-${label.toLowerCase().replaceAll(' ', '-')}`} onClick={() => setMobileOpen(false)} className={cn('group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[12px] font-semibold transition', active ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground/58 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground')}><Icon size={16} strokeWidth={active ? 2.3 : 1.8} /><span>{label}</span>{label === 'Activity' && <span className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-sidebar-primary px-1 font-mono text-[9px] font-bold text-sidebar-primary-foreground">3</span>}</Link>;
            })}
          </div>
        </nav>
        <div className="border-t border-sidebar-border p-4">
          <div className="mb-4 rounded-lg bg-sidebar-accent/50 p-3">
            <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold text-sidebar-foreground/70"><ShieldCheck size={13} className="text-[#5cb7a9]" /> Trust boundary active</div>
            <p className="text-[10px] leading-relaxed text-sidebar-foreground/42">The agent can investigate and propose. Humans approve consequential changes.</p>
          </div>
          <button type="button" data-testid="button-help" onClick={() => window.alert('ProofPilot keeps the reasoning trace visible. Start with a decision, then review evidence and approval boundaries.')} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[11px] text-sidebar-foreground/48 transition hover:bg-sidebar-accent hover:text-sidebar-foreground"><CircleHelp size={15} /> Help & principles</button>
          <div className="mt-2 flex items-center gap-3 rounded-lg px-3 py-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#d9a441] font-display text-[11px] font-bold text-[#202b3f]">MC</div>
            <div className="min-w-0 flex-1"><div className="truncate text-[11px] font-semibold">Maya Chen</div><div className="font-mono text-[9px] text-sidebar-foreground/40">Engineering</div></div>
            <ChevronDown size={14} className="text-sidebar-foreground/35" />
          </div>
        </div>
      </aside>
      {mobileOpen && <button type="button" aria-label="Close navigation" data-testid="button-close-mobile-nav" onClick={() => setMobileOpen(false)} className="fixed inset-0 z-30 bg-[#172238]/35 md:hidden" />}
      <div className="md:pl-[252px]">
        <header className="sticky top-0 z-20 flex h-[76px] items-center justify-between border-b border-border/80 bg-background/90 px-5 backdrop-blur-xl md:px-9">
          <div className="flex min-w-0 items-center gap-3">
            <button type="button" data-testid="button-open-mobile-nav" aria-label="Open navigation" onClick={() => setMobileOpen(true)} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted md:hidden"><Command size={18} /></button>
            <div className="hidden items-center gap-2 text-[11px] text-muted-foreground sm:flex"><span className="font-mono uppercase tracking-[.15em]">Decision</span><span className="text-border">/</span><span className="truncate font-semibold text-foreground">{decisionTitle}</span></div>
            <div className="flex items-center gap-2 sm:hidden"><span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground"><Radar size={13} /></span><span className="font-display text-sm font-semibold">ProofPilot</span></div>
          </div>
          <div className="flex items-center gap-2">
             <div className="hidden items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-[10px] font-semibold text-muted-foreground sm:flex"><span className={cn('h-1.5 w-1.5 rounded-full', webmcpReady ? 'bg-[#4e9b8f]' : 'bg-[#b1832f]')} /> {webmcpReady ? 'WebMCP ready' : 'Agent host needed'} <span className="font-mono text-[9px] text-muted-foreground/60">{webmcpReady ? 'live' : 'unsupported'}</span></div>
            <button type="button" data-testid="button-settings" onClick={() => window.alert('Workspace settings are managed by your team admin.')} className="rounded-lg p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"><Settings2 size={17} /></button>
          </div>
        </header>
        <main className="min-h-[calc(100dvh-76px)]">{children}</main>
      </div>
    </div>
  );
}

export function SectionEyebrow({ children, icon: Icon = Sparkles }: { children: ReactNode; icon?: typeof Sparkles }) {
  return <div className="mb-3 flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[.18em] text-muted-foreground"><Icon size={13} className="text-[#b1832f]" /> {children}</div>;
}

export function ExternalArrow() {
  return <ArrowUpRight size={14} />;
}