import { https } from 'firebase-functions';
import { auth } from 'firebase-admin';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const createUserAuth = async (email: string, isAdmin: boolean) => {
  const { uid } = await auth().createUser({ email });

  await auth().setCustomUserClaims(uid, { isAdmin });

  return uid;
};

export default https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new https.HttpsError('unauthenticated', 'auth/unauthenticated');
  }

  if (!context.auth.token.isAdmin) {
    console.warn(`[createUser] Non-admin user ${context.auth.uid} attempted to create user`);
    throw new https.HttpsError('permission-denied', 'auth/forbidden');
  }

  const { email, isAdmin } = data;

  if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email)) {
    throw new https.HttpsError('invalid-argument', 'auth/invalid-email');
  }

  console.log(`[createUser] Admin ${context.auth.uid} creating user: ${email}, isAdmin: ${!!isAdmin}`);

  let uid;
  try {
    uid = await createUserAuth(email, !!isAdmin);
  } catch (error: any) {
    console.error(`[createUser] Failed to create user ${email}:`, error);
    throw new https.HttpsError('invalid-argument', error.code || 'auth/unknown');
  }

  console.log(`[createUser] User created successfully: ${uid}`);
  return { uid };
});
