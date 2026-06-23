import { firestore } from 'firebase-functions';
import { auth } from 'firebase-admin';

export default firestore
  .document('/users/{uid}')
  .onUpdate((change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    if (before.isAdmin === after.isAdmin && before.cities === after.cities) {
      return null;
    }

    const { uid } = context.params;

    if (before.isAdmin !== after.isAdmin) {
      console.log(
        `[SECURITY] User ${uid} isAdmin changed: ${before.isAdmin} -> ${after.isAdmin}`
      );

      if (after.isAdmin === true) {
        console.warn(
          `[SECURITY] ADMIN PROMOTION: ${uid} promoted to admin. Ensure this was an authorized action.`
        );
      }
    }

    return auth().setCustomUserClaims(uid, {
      isAdmin: after.isAdmin || false,
      cities: after.cities || [],
    });
  });
