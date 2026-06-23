// Cache in-memory de tokens verificados
// O escopo global do Worker persiste entre requisições no mesmo isolate.
const tokenCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;
let cleanupCounter = 0;
const CLEANUP_INTERVAL = 10;

function cleanupCache() {
  const now = Date.now();
  for (const [key, value] of tokenCache) {
    if (now >= value.expiresAt) {
      tokenCache.delete(key);
    }
  }
}

function maybeCleanupCache() {
  cleanupCounter++;
  if (cleanupCounter >= CLEANUP_INTERVAL) {
    cleanupCounter = 0;
    cleanupCache();
  }
}

function decodeJwtPayload(token) {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export async function verifyFirebaseToken(idToken, env) {
  try {
    if (!idToken || typeof idToken !== 'string') return null;

    // Cache hit
    const cached = tokenCache.get(idToken);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.result;
    }

    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${env.FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      }
    );

    const data = await response.json();
    if (!response.ok || !data.users || data.users.length === 0) {
      tokenCache.delete(idToken);
      return null;
    }

    const user = data.users[0];

    const result = {
      uid: user.localId,
      email: user.email || '',
      email_verified: user.emailVerified || false,
      isAdmin: false,
      name: user.displayName || '',
    };

    // Define TTL: usa exp do JWT ou fallback de 5 min
    const jwt = decodeJwtPayload(idToken);
    const expMs = jwt && jwt.exp ? jwt.exp * 1000 : Date.now() + CACHE_TTL_MS;
    const expiresAt = Math.min(Date.now() + CACHE_TTL_MS, expMs);

    tokenCache.set(idToken, { result, expiresAt });

    maybeCleanupCache();

    return result;
  } catch (err) {
    console.error('Token verification error:', err);
    tokenCache.delete(idToken);
    return null;
  }
}
