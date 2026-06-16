import { database } from 'firebase-functions';
import { auth } from 'firebase-admin';

export default database.ref('/users/{uid}').onUpdate((change, context) => {
  const before = change.before.val();
  const after = change.after.val();

  if (before.isAdmin === after.isAdmin) {
    return null;
  }

  const { uid } = context.params;

  console.log(
    `[SECURITY] User ${uid} isAdmin changed (RTDB): ${before.isAdmin} -> ${after.isAdmin}`
  );

  if (after.isAdmin === true) {
    console.warn(
      `[SECURITY] ADMIN PROMOTION (RTDB): ${uid} promoted to admin. Ensure this was an authorized action.`
    );
  }

  return auth().setCustomUserClaims(uid, {
    isAdmin: after.isAdmin,
  });
});
