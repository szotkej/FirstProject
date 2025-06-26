// backend\services\userService.ts
import db from '../firebase/firestore.js';

export const updateUserPhotoURL = async (userId: string, photoURL: string) => {
  const userRef = db.collection('users').doc(userId);
  await userRef.update({ photoURL });
};
