import { useState, useEffect } from 'react';
import { authService } from '../services';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8787';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const unsubscribe = authService.onAuthChanged(async (firebaseUser) => {
      if (firebaseUser) {
        let admin = false;
        try {
          const tokenResult = await firebaseUser.getIdTokenResult();
          admin = tokenResult.claims.isAdmin === true;
        } catch {
          // fallback silencioso
        }

        if (cancelled) return;

        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
        });

        // Confirma o isAdmin real no Firestore (via Worker)
        try {
          const token = await firebaseUser.getIdToken();
          const resp = await fetch(`${API_BASE}/api/admin/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (resp.ok) {
            const data = await resp.json();
            admin = data.isAdmin;
          }
        } catch {
          // fallback silencioso para o valor do custom claim
        }

        if (!cancelled) {
          setIsAdmin(admin);
          setLoading(false);
        }
        return;
      }

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

  return { user, loading, isAuthenticated: !!user, isAdmin };
}
