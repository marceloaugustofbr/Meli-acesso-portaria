import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { authService } from '../services';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8787';
const ADMIN_CACHE_KEY = 'sa-admin-cache';

const AuthContext = createContext(null);

function getCachedAdmin(uid) {
  try {
    const raw = localStorage.getItem(ADMIN_CACHE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data.uid === uid && data.cachedAt && Date.now() - data.cachedAt < 10 * 60 * 1000) {
      return data.isAdmin;
    }
  } catch { /* ignore */ }
  return null;
}

function setCachedAdmin(uid, isAdmin) {
  try {
    localStorage.setItem(ADMIN_CACHE_KEY, JSON.stringify({ uid, isAdmin, cachedAt: Date.now() }));
  } catch { /* ignore */ }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const unsubscribe = authService.onAuthChanged(async (firebaseUser) => {
      if (firebaseUser) {
        let admin = false;

        const cached = getCachedAdmin(firebaseUser.uid);
        if (cached !== null) {
          admin = cached;
        }

        try {
          const tokenResult = await firebaseUser.getIdTokenResult();
          if (!cancelled) {
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
            });
          }

          const serverAdmin = await fetch(`${API_BASE}/api/admin/me`, {
            headers: { Authorization: `Bearer ${tokenResult.token}` },
          }).then((r) => (r.ok ? r.json() : null)).catch(() => null);

          if (serverAdmin) {
            admin = serverAdmin.isAdmin;
          }
        } catch {
          // fallback para custom claim ou cache
        }

        if (!cancelled) {
          setCachedAdmin(firebaseUser.uid, admin);
          setIsAdmin(admin);
          setLoading(false);
        }
        return;
      }

      localStorage.removeItem(ADMIN_CACHE_KEY);
      if (!cancelled) {
        setUser(null);
        setIsAdmin(false);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const value = useMemo(() => ({ user, loading, isAuthenticated: !!user, isAdmin }), [user, loading, isAdmin]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    return { user: null, loading: true, isAuthenticated: false, isAdmin: false };
  }
  return ctx;
}
