export const API_BASE = 'http://192.168.31.229:5000';

export async function postWorkout(payload: Record<string, any>) {
  try {
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

export async function fetchHistory(userId: string) {
  try {
    const url = `${API_BASE}/api/history/${encodeURIComponent(userId)}`;
    console.log('Fetching history from:', url);
    const res = await fetch(url);
    console.log('Fetch response status:', res.status);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    console.log('History data:', data);
    return data;
  } catch (e) {
    console.warn('fetchHistory error:', e);
    return [];
  }
}
