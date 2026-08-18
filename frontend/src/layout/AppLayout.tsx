import { useEffect, useRef, useState } from 'react';
import { NavLink, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { api } from '../api/client';
import type { Notification } from '../types/domain';
import {
  IconAward,
  IconBell,
  IconBook,
  IconBuilding,
  IconClipboard,
  IconClose,
  IconGrid,
  IconLogOut,
  IconMenu,
  IconMoon,
  IconShield,
  IconSun,
  IconUsers,
} from '../components/icons';
import { useTheme } from './useTheme';

interface NavItem {
  to: string;
  label: string;
  icon: (props: { className?: string }) => React.ReactElement;
  end?: boolean;
  badge?: number;
}
interface NavGroup {
  label: string;
  items: NavItem[];
}

function initials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

function roleLabel(roles: string[]) {
  if (roles.length === 0) return 'No role assigned';
  const primary = roles[0].replace(/_/g, ' ');
  const rest = roles.length - 1;
  return rest > 0 ? `${primary} +${rest}` : primary;
}

/** Wraps every authenticated page: a persistent, role-aware sidebar (collapsing to a
 * drawer on narrow viewports), a light/dark theme toggle, a notification badge, and
 * sign-out. Pages render into <Outlet/>. Findability comes from here: every destination
 * a role can reach lives in one grouped, always-visible list rather than being
 * discoverable only from a dashboard card. */
export function AppLayout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    let cancelled = false;
    api
      .get<Notification[]>('/notifications')
      .then((list) => {
        if (!cancelled) setUnreadCount(list.filter((n) => !n.isRead).length);
      })
      .catch(() => {
        /* non-critical — the badge just stays at 0 */
      });
    return () => {
      cancelled = true;
    };
  }, [location.pathname]);

  // Close the mobile drawer on every navigation.
  useEffect(() => setDrawerOpen(false), [location.pathname]);

  // Move focus to the new page's content on every client-side navigation (skip the very
  // first render, which already has natural focus flow from the login redirect). SPA
  // route changes don't reload the document, so without this a screen reader user gets
  // no cue that the page changed at all.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    mainRef.current?.focus();
  }, [location.pathname]);

  if (!user) return null;
  // Force the change-password screen before anything else — a temporary password
  // shouldn't be usable to browse the rest of the app. /change-password itself lives
  // outside this layout (see App.tsx) so this redirect can't loop.
  if (user.mustChangePassword) return <Navigate to="/change-password" replace />;

  const isStudent = user.roles.includes('STUDENT');
  const isLecturer = user.roles.includes('LECTURER');
  const isStaff = user.roles.some((r) =>
    ['SUPER_ADMIN', 'REGISTRAR', 'ADMISSIONS_OFFICER', 'DEAN', 'HEAD_OF_DEPARTMENT'].includes(r),
  );
  const isSuperAdmin = user.roles.includes('SUPER_ADMIN');

  const groups: NavGroup[] = [
    { label: 'Overview', items: [{ to: '/dashboard', label: 'Dashboard', icon: IconGrid, end: true }] },
  ];
  if (isStudent) {
    groups.push({
      label: 'Learning',
      items: [
        { to: '/my-courses', label: 'My Courses', icon: IconBook },
        { to: '/transcript', label: 'Transcript', icon: IconAward },
      ],
    });
  }
  if (isLecturer) {
    groups.push({ label: 'Teaching', items: [{ to: '/my-offerings', label: 'My Offerings', icon: IconUsers }] });
  }
  if (isStaff) {
    const items: NavItem[] = [
      { to: '/admin/academic-structure', label: 'Academic Structure', icon: IconBuilding },
      { to: '/admin/applications', label: 'Applications', icon: IconClipboard },
    ];
    if (isSuperAdmin) items.push({ to: '/admin/users', label: 'Users & Roles', icon: IconShield });
    groups.push({ label: 'Administration', items });
  }
  groups.push({
    label: 'Updates',
    items: [{ to: '/notifications', label: 'Notifications', icon: IconBell, badge: unreadCount }],
  });

  const sidebar = (
    <nav className={`app-sidebar${drawerOpen ? ' is-open' : ''}`} aria-label="Primary">
      <button
        type="button"
        className="icon-button app-sidebar-close"
        onClick={() => setDrawerOpen(false)}
        aria-label="Close menu"
      >
        <IconClose />
      </button>
      <NavLink to="/dashboard" className="app-brand">
        <span className="app-brand-mark" aria-hidden="true">
          B
        </span>
        <span className="app-brand-name">BaroTech</span>
      </NavLink>

      <div className="app-nav">
        {groups.map((group) => (
          <div key={group.label}>
            <div className="app-nav-group-label" id={`nav-group-${group.label}`}>
              {group.label}
            </div>
            <div className="app-nav-group" role="group" aria-labelledby={`nav-group-${group.label}`}>
              {group.items.map((item) => (
                <NavLink key={item.to} to={item.to} end={item.end} className="app-nav-link">
                  <item.icon className="icon" />
                  <span>{item.label}</span>
                  {!!item.badge && (
                    <span className="badge-count" aria-label={`${item.badge} unread`}>
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="app-sidebar-footer">
        <div className="app-user-card">
          <span className="app-user-avatar" aria-hidden="true">
            {initials(user.firstName, user.lastName)}
          </span>
          <div className="app-user-meta">
            <div className="app-user-name">
              {user.firstName} {user.lastName}
            </div>
            <div className="app-user-role">{roleLabel(user.roles)}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <button
            type="button"
            className="icon-button"
            style={{ flex: 1 }}
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          >
            {theme === 'dark' ? <IconSun /> : <IconMoon />}
          </button>
          <button type="button" className="icon-button" style={{ flex: 1 }} onClick={logout} aria-label="Sign out">
            <IconLogOut />
          </button>
        </div>
      </div>
    </nav>
  );

  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      {sidebar}
      {drawerOpen && (
        <button type="button" className="app-scrim" aria-label="Close menu" onClick={() => setDrawerOpen(false)} />
      )}

      <div className="app-main">
        <header className="app-topbar">
          <button type="button" className="icon-button" onClick={() => setDrawerOpen(true)} aria-label="Open menu">
            <IconMenu />
          </button>
          <span className="app-brand-name" style={{ fontSize: '1rem' }}>
            BaroTech
          </span>
          <NavLink to="/notifications" className="icon-button" aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}>
            <IconBell />
          </NavLink>
        </header>
        <main className="app-content" id="main-content" tabIndex={-1} ref={mainRef}>
          <Outlet />
          <AppFooter />
        </main>
      </div>
    </div>
  );
}

function AppFooter() {
  return (
    <footer className="app-footer">
      <span>© {new Date().getFullYear()} BaroTech University. All rights reserved.</span>
      <nav aria-label="Footer">
        <button type="button" className="icon-button" style={{ display: 'none' }} />
        <a href="mailto:support@barotech.edu">Contact support</a>
        <span>Privacy &amp; data protection policy — see Registrar's Office</span>
      </nav>
    </footer>
  );
}
