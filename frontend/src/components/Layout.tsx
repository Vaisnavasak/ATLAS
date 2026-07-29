import React from 'react';
import { LogOut, User, LayoutDashboard, Briefcase, Bell, GraduationCap, ShieldCheck, Users, HelpCircle, FileSpreadsheet, ClipboardList } from 'lucide-react';
import type { User as UserType } from '../types';

interface LayoutProps {
  user: UserType | null;
  onLogout: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ user, onLogout, activeTab, setActiveTab, children }) => {
  const isStudent = user?.role === 'student';
  const isCoordinator = user?.role === 'coordinator';
  const isOfficer = user?.role === 'officer';

  // Navigation Items according to Roles
  const getNavItems = () => {
    if (isStudent) {
      return [
        { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
        { id: 'profile', label: 'My Profile', icon: GraduationCap },
        { id: 'drives', label: 'Placement Drives', icon: Briefcase },
        { id: 'announcements', label: 'Announcements', icon: Bell },
      ];
    }
    if (isCoordinator) {
      return [
        { id: 'dashboard', label: 'Department Stats', icon: LayoutDashboard },
        { id: 'verification', label: 'Profile Approval', icon: ShieldCheck },
        { id: 'drives', label: 'Manage Drives', icon: Briefcase },
        { id: 'screening', label: 'AI Student Filter', icon: Users },
        { id: 'applications', label: 'Application Tracking', icon: ClipboardList },
        { id: 'announcements', label: 'Publish Broadcast', icon: Bell },
      ];
    }
    if (isOfficer) {
      return [
        { id: 'dashboard', label: 'College Analytics', icon: LayoutDashboard },
        { id: 'coordinators', label: 'Coordinators Directory', icon: Users },
        { id: 'drives', label: 'Recruitment Drives', icon: Briefcase },
        { id: 'applications', label: 'Application Tracking', icon: ClipboardList },
        { id: 'reports', label: 'Report Center', icon: FileSpreadsheet },
        { id: 'announcements', label: 'Announcements', icon: Bell },
      ];
    }
    return [];
  };

  const menuItems = getNavItems();

  return (
    <div className="min-h-screen flex text-slate-100 relative">
      {/* Background Neon Grid */}
      <div className="cyber-grid" />
      <div className="neon-glow-cyan top-10 left-10" />
      <div className="neon-glow-pink bottom-10 right-10" />

      {/* Sidebar Navigation */}
      <aside className="w-72 glass-panel border-r border-slate-800/80 flex flex-col z-20">
        {/* Brand Logo */}
        <div className="p-6 border-b border-slate-800/80 flex flex-col justify-center items-center">
          <span className="text-3xl font-extrabold tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-cyber-cyan to-indigo-500 drop-shadow-[0_0_10px_rgba(0,242,254,0.5)]">
            ATLAS
          </span>
          <span className="text-[10px] text-cyber-pink tracking-[0.25em] font-semibold mt-1 uppercase">
            Recruitment AI
          </span>
        </div>

        {/* User Quick Info */}
        <div className="p-4 mx-4 my-4 rounded-xl bg-slate-900/60 border border-slate-850 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-cyber-purple/20 border border-cyber-purple/40 flex items-center justify-center text-cyber-purple font-bold">
            {user?.name.charAt(0)}
          </div>
          <div className="flex-1 overflow-hidden">
            <h4 className="font-semibold text-xs text-white truncate">{user?.name}</h4>
            <p className="text-[10px] text-slate-400 capitalize font-mono">{user?.role} Cell</p>
          </div>
        </div>

        {/* Menu Navigation */}
        <nav className="flex-1 px-4 space-y-1">
          {menuItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-cyber-cyan/15 to-cyber-blue/5 border-l-4 border-cyber-cyan text-cyber-cyan shadow-neon-cyan/10'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40 border-l-4 border-transparent'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-cyber-cyan' : 'text-slate-400'}`} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Bottom Panel */}
        <div className="p-4 border-t border-slate-800/80">
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-900/60 hover:bg-cyber-pink/20 hover:text-cyber-pink border border-slate-800 hover:border-cyber-pink/40 text-slate-400 font-semibold text-sm transition-all"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Panel */}
      <div className="flex-1 flex flex-col overflow-y-auto max-h-screen">
        {/* Top Header */}
        <header className="h-20 glass-panel border-b border-slate-800/85 px-8 flex justify-between items-center z-10 sticky top-0">
          <div>
            <h2 className="text-xl font-bold text-white tracking-wide">
              {menuItems.find(i => i.id === activeTab)?.label || 'Overview'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {isStudent && user?.department}
              {isCoordinator && `${user?.department} Administration`}
              {isOfficer && 'University-Wide Recruitment Management'}
            </p>
          </div>

          <div className="flex items-center gap-4">
            {isStudent && (
              <span className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase border tracking-wider ${
                user?.is_verified
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-cyber-pink/10 text-cyber-pink border-cyber-pink/30'
              }`}>
                {user?.is_verified ? 'Verified Profile' : 'Pending Verification'}
              </span>
            )}
            {isCoordinator && (
              <span className="px-3 py-1 rounded-full text-[11px] font-bold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/30 tracking-wider">
                DEPT COORDINATOR
              </span>
            )}
            {isOfficer && (
              <span className="px-3 py-1 rounded-full text-[11px] font-bold uppercase bg-cyber-purple/10 text-cyber-purple border border-cyber-purple/30 tracking-wider">
                PLACEMENT OFFICER
              </span>
            )}
          </div>
        </header>

        {/* Page Area */}
        <main className="p-8 flex-1">
          {children}
        </main>
      </div>
    </div>
  );
};
