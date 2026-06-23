import { firestore } from 'firebase-functions';
import { auth } from 'firebase-admin';

export default firestore
  .document('/users/{uid}')
  .onCreate((snapshot, context) => {
    const data = snapshot.data();
    const { uid } = context.params;

    console.log(`[SECURITY] User ${uid} created: isAdmin=${data.isAdmin}`);

    if (data.isAdmin === true) {
      console.warn(
        `[SECURITY] ADMIN CREATION: ${uid} created as admin. Ensure this was an authorized action.`
      );
    }

    return auth().setCustomUserClaims(uid, {
      isAdmin: data.isAdmin || false,
      cities: data.cities || [],
    });
  });
