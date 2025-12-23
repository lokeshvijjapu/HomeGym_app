import React, {useState} from 'react';
import {SafeAreaView, View, Text, TextInput, TouchableOpacity, Alert, StyleSheet} from 'react-native';
import auth from '@react-native-firebase/auth';

export default function SignUpScreen({navigation}: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  const handleSignUp = async () => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanEmail || !cleanPassword) {
      Alert.alert('Missing info', 'Enter email and password to continue.');
      return;
    }
    if (cleanPassword.length < 6) {
      Alert.alert('Weak Password', 'Password must be at least 6 characters.');
      return;
    }
    if (cleanPassword !== confirm) {
      Alert.alert('Password Mismatch', 'Passwords do not match.');
      return;
    }

    try {
      await auth().createUserWithEmailAndPassword(cleanEmail, cleanPassword);
      navigation.replace('Home', {userEmail: cleanEmail});
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        Alert.alert('Email Exists', 'This email is already registered. Try logging in.');
      } else if (error.code === 'auth/invalid-email') {
        Alert.alert('Invalid Email', 'Please enter a valid email address.');
      } else {
        Alert.alert('Signup failed', error.message);
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={{padding: 20}}>
        <Text style={styles.title}>Create Account</Text>

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="you@example.com"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          placeholder="••••••"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <Text style={styles.label}>Confirm Password</Text>
        <TextInput
          style={styles.input}
          placeholder="••••••"
          secureTextEntry
          value={confirm}
          onChangeText={setConfirm}
        />

        <TouchableOpacity style={styles.button} onPress={handleSignUp} activeOpacity={0.85}>
          <Text style={styles.buttonText}>Sign Up</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.link} onPress={() => navigation.goBack()}>
          <Text style={styles.linkText}>Already have an account? Log in</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, justifyContent: 'center', backgroundColor: '#0f172a'},
  title: {fontSize: 28, color: '#e2e8f0', fontWeight: '700', marginBottom: 20, textAlign: 'center'},
  label: {color: '#94a3b8', marginTop: 8, marginBottom: 6},
  input: {backgroundColor: '#111827', color: '#e2e8f0', padding: 12, borderRadius: 8, marginBottom: 8},
  button: {marginTop: 12, backgroundColor: '#0ea5e9', paddingVertical: 14, borderRadius: 10, alignItems: 'center'},
  buttonText: {color: '#04263b', fontWeight: '700'},
  link: {marginTop: 12, alignItems: 'center'},
  linkText: {color: '#cbd5e1'},
});
