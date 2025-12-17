import { saveWorkoutToFirestore } from './src/firestoreHistory';

export const API_BASE = 'http://192.168.31.229:5000';

export async function postWorkout(payload: Record<string, any>) {
  try {
    // Firestore save removed here to avoid duplicate entries.
    // The primary save is handled explicitly in the app UI (saveWorkoutToFirestore).
    // If you want backend to also save, re-enable this call.
    // saveWorkoutToFirestore(payload).catch(err =>
    //   console.warn('Firestore save failed:', err),
    // );

    // Existing backend call
    const res = await fetch(`${API_BASE}/api/workout/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    return await res.json();
  } catch (e) {
    console.warn('postWorkout error', e);
    throw e;
  }
}
