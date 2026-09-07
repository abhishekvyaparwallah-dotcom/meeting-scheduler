'use client';

import { Calendar, PhoneCall, Users, Shield, LogOut, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { signOut } from 'next-auth/react';

type Props = {
  collapsed: boolean;
  mobileOpen: boolean;
  onToggleCollapse: () => void;
  onCloseMobile: () => void;
  activeView: 'calendar' | 'calling' | 'meetings' | 'admin';
  onSelectView: (view: 'calendar' | 'calling' | 'meetings' | 'admin') => void;
  userRole: 'ADMIN' | 'TELECALLER';
  userName?: string;
  userEmail?: string;
};

export default function Sidebar({
  collapsed,
  mobileOpen,
  onToggleCollapse,
  onCloseMobile,
  activeView,
  onSelectView,
  userRole,
  userName,
  userEmail,
}: Props) {
  const navItems = [
    { id: 'calendar' as const, label: 'Calendar & Slots', icon: Calendar },
    { id: 'calling' as const, label: 'Calling CRM', icon: PhoneCall },
    {
      id: 'meetings' as const,
      label: userRole === 'ADMIN' ? 'Meetings & Clients' : 'My Meetings',
      icon: Users,
    },
    ...(userRole === 'ADMIN'
      ? [{ id: 'admin' as const, label: 'Admin Console', icon: Shield }]
      : []),
  ];

  return (
    <>
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm md:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex flex-col justify-between border-r border-slate-200 bg-white text-slate-800 transition-all duration-200 shadow-sm ${
          collapsed ? 'w-20' : 'w-64'
        } ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
      >
        <div>
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3.5">
            <div className={`flex flex-col overflow-hidden ${collapsed ? 'items-center w-full' : 'items-start'}`}>
              <img
                src="/logo.png"
                alt="Vyapar Wallah"
                className={`w-auto object-contain ${
                  collapsed ? 'h-8 max-w-[44px]' : 'h-9 max-w-[165px]'
                }`}
              />
              {!collapsed && (
                <p className="text-[10px] uppercase tracking-wider text-brand-orange font-bold mt-1 pl-0.5">
                  Meeting & CRM
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={onCloseMobile}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 md:hidden"
            >
              <X size={18} />
            </button>
          </div>

          <nav className="mt-4 space-y-1.5 px-3">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onSelectView(item.id);
                    onCloseMobile();
                  }}
                  className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-bold transition ${
                    isActive
                      ? 'bg-brand-orange text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  } ${collapsed ? 'justify-center' : ''}`}
                  title={item.label}
                >
                  <Icon size={18} className="shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="border-t border-slate-100 p-3 space-y-2.5">
          {!collapsed && (
            <div className="rounded-xl bg-slate-50 p-3 border border-slate-200/80 shadow-xs">
              <p className="text-xs font-bold text-slate-900 truncate">{userName || 'User'}</p>
              <p className="text-[11px] text-slate-500 truncate">{userEmail}</p>
              <span className="mt-1.5 inline-block rounded-md bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-brand-orange border border-orange-200">
                {userRole}
              </span>
            </div>
          )}

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: '/login' })}
              className={`flex flex-1 items-center gap-2 rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-100 border border-rose-100 transition ${
                collapsed ? 'justify-center' : ''
              }`}
              title="Sign Out"
            >
              <LogOut size={16} />
              {!collapsed && <span>Sign Out</span>}
            </button>

            <button
              type="button"
              onClick={onToggleCollapse}
              className="hidden md:flex rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition border border-slate-200"
              title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
