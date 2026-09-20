'use client';

import Link from 'next/link';
import { BookOpen, Search, LogOut } from 'lucide-react';
import { signOut, useSession } from 'next-auth/react';
import { useEffect, useMemo, useState } from 'react';

function greeting(hour: number) {
  if (hour < 5) return 'Good night';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  if (hour < 21) return 'Good evening';
  return 'Good night';
}

export function Nav() {
  const { data: session, status } = useSession();
  const [hour, setHour] = useState(new Date().getHours());
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    const id = window.setInterval(() => setHour(new Date().getHours()), 60000);
    return () => window.clearInterval(id);
  }, []);

  const firstName = useMemo(() => {
    const name = session?.user?.name?.trim() || '';
    return name.split(/\s+/)[0] || 'Reader';
  }, [session?.user?.name]);

  const isSignedIn = status === 'authenticated';
  const isAdmin = (session?.user as ({ role?: string } | undefined))?.role === 'ADMIN';

  return (
    <header className="site-header glass">
      <nav className="nav">
        <Link href="/" className="brand">RHYTHM<span>READ</span></Link>
        <div className="nav-links">
          <Link href="/discover">Discover</Link>
          <Link href="/library">My Library</Link>
          <Link href="/discover?free=true">Free Reads</Link>
        </div>
        <div className="nav-actions">
          <Link className="btn btn-ghost" href="/discover" aria-label="Search"><Search size={15} /></Link>
          {isSignedIn ? (
            <div className="nav-profile-wrap">
              <button type="button" className="nav-profile" onClick={() => setMenu((v) => !v)} aria-expanded={menu}>
                {session.user?.image ? (
                  <img src={session.user.image} alt={session.user.name ?? 'Profile'} />
                ) : (
                  <span className="nav-avatar-fallback">{firstName[0].toUpperCase()}</span>
                )}
                <span className="nav-profile-name">{firstName}</span>
              </button>
              {menu && (
                <div className="nav-menu glass">
                  <div className="nav-menu-greeting">
                    <strong>{greeting(hour)}, {firstName}.</strong>
                    <span>{session.user?.email ?? ''}</span>
                  </div>
                  <Link href="/library" onClick={() => setMenu(false)}>My Library</Link>
                  <Link href="/discover?free=true" onClick={() => setMenu(false)}>Free Reads</Link>
                  <Link href="/contact" onClick={() => setMenu(false)}>Contact</Link>
                  {isAdmin ? <Link href="/admin/analytics" onClick={() => setMenu(false)}>Analytics</Link> : null}
                  {isAdmin ? (
                    <Link href="/admin" onClick={() => setMenu(false)}>Admin</Link>
                  ) : null}
                  <button type="button" onClick={() => signOut({ callbackUrl: '/' })}>
                    <LogOut size={14} /> Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link className="btn btn-dark" href="/login"><BookOpen size={15} /> Sign in</Link>
          )}
        </div>
      </nav>
    </header>
  );
}
