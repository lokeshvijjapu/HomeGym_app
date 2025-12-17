import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

export type Workout = {
  id: string;
  exercise: string;
  weight: number;
  target_reps: number;
  actual_reps: number;
  target_time: number;
  actual_time: number;
  device_id: string;
  createdAt?: any;
};

export async function fetchWorkoutHistory(): Promise<Workout[]> {
  const user = auth().currentUser;

  if (!user) {
    console.warn('No user logged in');
    return [];
  }

  try {
    const snapshot = await firestore()
      .collection('users')
      .doc(user.uid)
      .collection('workouts')
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...(doc.data() as any),
    }));
  } catch (e) {
    console.error('Failed to fetch workout history', e);
    return [];
  }
}

export async function saveWorkoutToFirestore(workout: any) {
  const user = auth().currentUser;
  if (!user) return;

  const uid = user.uid;

  await firestore()
    .collection('users')
    .doc(uid)
    .collection('workouts')
    .add({
      ...workout,
      createdAt: firestore.FieldValue.serverTimestamp(),
    });
}
