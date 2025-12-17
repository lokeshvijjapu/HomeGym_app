import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import {fetchWorkoutHistory, Workout} from '../firestoreHistory';

export default function HistoryScreen() {
  const [history, setHistory] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const data = await fetchWorkoutHistory();
      setHistory(data);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return <ActivityIndicator size="large" style={{marginTop: 40}} />;
  }

  if (history.length === 0) {
    return (
      <View style={styles.center}>
        <Text>No workout history found</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={history}
      keyExtractor={item => item.id}
      contentContainerStyle={{padding: 16}}
      renderItem={({item}) => (
        <View style={styles.card}>
          <Text style={styles.exercise}>{item.exercise}</Text>
          <Text>Weight: {item.weight} kg</Text>
          <Text>
            Reps: {item.actual_reps} / {item.target_reps}
          </Text>
          <Text>
            Time: {item.actual_time}s / {item.target_time}s
          </Text>
          <Text style={styles.date}>
            {item.createdAt?.toDate?.().toLocaleString?.() ?? ''}
          </Text>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 10,
    marginBottom: 12,
    elevation: 3,
  },
  exercise: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  date: {
    marginTop: 6,
    fontSize: 12,
    color: '#666',
  },
});
