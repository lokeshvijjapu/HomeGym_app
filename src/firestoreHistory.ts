import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

export const saveWorkoutToFirestore = async (workout: any) => {
  console.log('🔥 saveWorkoutToFirestore CALLED');
  console.log('Workout payload:', workout);

  const user = auth().currentUser;
  console.log('Current user:', user);

  if (!user) {
    console.warn('❌ No user logged in, Firestore save skipped');
    return;
  }

  const uid = user.uid;
  console.log('Saving workout for UID:', uid);

  try {
    const ref = await firestore()
      .collection('users')
      .doc(uid)
      .collection('workouts')
      .add({
        ...workout,
        createdAt: firestore.FieldValue.serverTimestamp(),
      });

    console.log('✅ Workout saved with ID:', ref.id);
  } catch (e) {
    console.error('❌ Firestore save error:', e);
  }
};
