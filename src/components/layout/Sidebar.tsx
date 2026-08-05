import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Calendar,
  UserCheck,
  ClipboardCheck,
  DollarSign,
  BarChart3,
  Settings,
  Building2,
  Bell,
  ChevronLeft,
  ChevronRight,
  Send,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { cn } from '../../utils/helpers';
import { NAV_ITEMS, ADMIN_NAV_ITEMS, APP_NAME } from '../../utils/storage';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard: LayoutDashboard,
  Users: Users,
  Calendar: Calendar,
  UserCheck: UserCheck,
  ClipboardCheck: ClipboardCheck,
  DollarSign: DollarSign,
  BarChart3: BarChart3,
  Settings: Settings,
  Building2: Building2,
  Send: Send,
  LogOut: LogOut,
};

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { profile } = useAuth();
  const { unreadCount } = useNotifications();
  const location = useLocation();

  const isAdmin = profile?.role === 'admin';

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen bg-slate-900 text-white transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className="flex h-full flex-col">
        <div className="flex h-16 items-center justify-between border-b border-slate-700 px-4">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500">
                <Users className="h-5 w-5" />
              </div>
              <span className="font-semibold text-lg">{APP_NAME.split(' ')[0]}</span>
            </div>
          )}
          <button
            onClick={onToggle}
            className="ml-auto rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto py-4 px-2">
          {NAV_ITEMS.map((item) => {
            const Icon = iconMap[item.icon] || LayoutDashboard;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors',
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  )
                }
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            );
          })}

          {isAdmin && (
            <>
              <div className="my-4 border-t border-slate-700" />
              <p className={cn('px-3 text-xs font-semibold uppercase text-slate-500', collapsed && 'hidden')}>
                Administration
              </p>
              {ADMIN_NAV_ITEMS.map((item) => {
                const Icon = iconMap[item.icon] || Settings;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors',
                        isActive
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      )
                    }
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    {!collapsed && <span>{item.label}</span>}
                  </NavLink>
                );
              })}
            </>
          )}
        </nav>

        <div className="border-t border-slate-700 p-2">
          <NavLink
            to="/notifications"
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-slate-300 hover:bg-slate-800 hover:text-white',
              location.pathname === '/notifications' && 'bg-slate-800'
            )}
          >
            <div className="relative">
              <Bell className="h-5 w-5 flex-shrink-0" />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
            {!collapsed && <span>Notifications</span>}
          </NavLink>
        </div>
      </div>
    </aside>
  );
}
