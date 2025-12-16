import React, {useEffect, useState} from 'react';
import {
  SafeAreaView,
  View,
  Text,
  ActivityIndicator,
  FlatList,
  ScrollView,
  PermissionsAndroid,
  Platform,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
  Linking,
  TextInput,
} from 'react-native';
import Slider from '@react-native-community/slider';
import {BleManager, Device, Characteristic, State} from 'react-native-ble-plx';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Buffer} from 'buffer';
import {postWorkout, fetchHistory} from './api';
import auth from '@react-native-firebase/auth';

const manager = new BleManager();

async function checkAndRequestPermissions() {
  if (Platform.OS !== 'android') {
    return {bluetooth: true, location: true};
  }

  const apiLevel = Platform.Version as number;
  const permissions: string[] = [];

  if (apiLevel >= 31) {
    permissions.push(
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
    );
  }
  permissions.push(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);

  try {
    const granted = await PermissionsAndroid.requestMultiple(permissions);
    
    let bluetoothGranted = true;
    let locationGranted = true;

    if (apiLevel >= 31) {
      bluetoothGranted =
        granted[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] ===
          PermissionsAndroid.RESULTS.GRANTED &&
        granted[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] ===
          PermissionsAndroid.RESULTS.GRANTED;
    }

    locationGranted =
      granted[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] ===
        PermissionsAndroid.RESULTS.GRANTED;

    return {bluetooth: bluetoothGranted, location: locationGranted};
  } catch (err) {
    console.warn(err);
    return {bluetooth: false, location: false};
  }
}

async function ensureBlePermissions() {
  if (Platform.OS !== 'android') {
    return true;
  }

  const apiLevel = Platform.Version as number;

  if (apiLevel >= 31) {
    const scanGranted = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
    );
    const connGranted = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
    );
    if (scanGranted && connGranted) {
      return true;
    }

    const granted = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
    ]);
    return (
      granted[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] ===
        PermissionsAndroid.RESULTS.GRANTED &&
      granted[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] ===
        PermissionsAndroid.RESULTS.GRANTED
    );
  } else {
    const locGranted = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    );
    if (locGranted) {
      return true;
    }
    const res = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    );
    return res === PermissionsAndroid.RESULTS.GRANTED;
  }
}

type RootStackParamList = {
  Login: undefined;
  Home: {userEmail: string};
  History: {userEmail: string};
  Device: {device: Device; userEmail: string};
  Workout: {
    device: Device;
    deviceId: string;
    exerciseId: string;
    exerciseName: string;
    serviceUuid: string;
    characteristicUuid: string;
    userEmail: string;
  };
  ActiveWorkout: {
    device: Device;
    deviceId: string;
    exerciseId: string;
    exerciseName: string;
    weight: number;
    targetReps: number;
    targetTime: number;
    serviceUuid: string;
    characteristicUuid: string;
    userEmail: string;
  };
};

type LoginProps = NativeStackScreenProps<RootStackParamList, 'Login'>;
type HomeProps = NativeStackScreenProps<RootStackParamList, 'Home'>;
type DeviceProps = NativeStackScreenProps<RootStackParamList, 'Device'>;
type WorkoutProps = NativeStackScreenProps<RootStackParamList, 'Workout'>;
type ActiveWorkoutProps = NativeStackScreenProps<RootStackParamList, 'ActiveWorkout'>;

type HistoryProps = NativeStackScreenProps<RootStackParamList, 'History'>;

/* ----------------- Login Screen ----------------- */

function LocalLoginScreen({navigation}: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [focused, setFocused] = useState<'email' | 'password' | null>(null);

  const onLogin = async () => {
    if (!email || !password) {
      Alert.alert('Missing info', 'Enter email and password to continue.');
      return;
    }

    try {
      const cleanEmail = email.trim().toLowerCase();
      const cleanPassword = password.trim();

      await auth().signInWithEmailAndPassword(cleanEmail, cleanPassword);
      navigation.replace('Home', { userEmail: cleanEmail });

    } catch (error: any) {
      console.log('Firebase login error:', error.code, error.message);

      const cleanEmail = email.trim().toLowerCase();
      const cleanPassword = password.trim();

      // If user does not exist OR Firebase gives invalid-credential,
      // try creating the account
      if (
        error.code === 'auth/user-not-found' ||
        error.code === 'auth/invalid-credential'
      ) {
        try {
          await auth().createUserWithEmailAndPassword(
            cleanEmail,
            cleanPassword
          );
          navigation.replace('Home', { userEmail: cleanEmail });
        } catch (signupError: any) {
          if (signupError.code === 'auth/weak-password') {
            Alert.alert(
              'Weak Password',
              'Password must be at least 6 characters.'
            );
          } else if (signupError.code === 'auth/email-already-in-use') {
            Alert.alert(
              'Email Exists',
              'This email is already registered. Try logging in.'
            );
          } else {
            Alert.alert('Signup failed', signupError.message);
          }
        }
      } else if (error.code === 'auth/invalid-email') {
        Alert.alert('Invalid Email', 'Please enter a valid email address.');
      } else if (error.code === 'auth/wrong-password') {
        Alert.alert('Wrong Password', 'Password is incorrect.');
      } else {
        Alert.alert('Login error', error.message);
      }
    }
  };

  return (
    <SafeAreaView style={styles.containerFlex}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.loginHeader}>
          <Text style={styles.appTitleLarge}>💪 Neonflake Gym</Text>
          <Text style={styles.appSubtitleLarge}>Smart Home Gym Controller</Text>
          <Text style={styles.appDescriptionText}>Track your strength. Achieve your goals.</Text>
        </View>

        <View style={{marginTop: 60}}>
        <Text style={styles.formLabel}>Email</Text>
        <TextInput
          style={[styles.inputField, focused === 'email' && styles.inputFieldFocused]}
          placeholder="your@email.com"
          placeholderTextColor="#64748b"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
          onFocus={() => setFocused('email')}
          onBlur={() => setFocused(null)}
        />

        <Text style={styles.formLabel}>Password</Text>
        <TextInput
          style={[styles.inputField, focused === 'password' && styles.inputFieldFocused]}
          placeholder="••••••••"
          placeholderTextColor="#64748b"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          onFocus={() => setFocused('password')}
          onBlur={() => setFocused(null)}
        />

          <TouchableOpacity
            style={styles.buttonPrimary}
            onPress={onLogin}
            activeOpacity={0.85}>
            <Text style={styles.buttonPrimaryText}>LOGIN</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ----------------- Home / Scanner Screen ----------------- */

function HomeScreen({navigation, route}: HomeProps) {
  const {userEmail} = route.params;
  const [devices, setDevices] = useState<Device[]>([]);
  const [scanning, setScanning] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    const checkBtState = async () => {
      const state = await manager.state();
      if (state !== State.PoweredOn) {
        Alert.alert(
          'Bluetooth is off',
          'Turn Bluetooth on to use this app.',
          [
            {text: 'Cancel', style: 'cancel'},
            {text: 'Open app settings', onPress: () => Linking.openSettings()},
          ],
        );
      }
    };

    checkBtState();

    const sub = manager.onStateChange(newState => {
      if (newState === State.PoweredOff) {
        Alert.alert(
          'Bluetooth turned off',
          'Turn it on again to connect to devices.',
        );
      }
    }, true);

    return () => {
      sub.remove();
      manager.stopDeviceScan();
    };
  }, []);

  const startScan = async () => {
    const permOk = await ensureBlePermissions();
    if (!permOk) {
      Alert.alert(
        'Permissions required',
        'Grant Bluetooth / Location permissions for this app.',
        [
          {text: 'Cancel', style: 'cancel'},
          {text: 'Open app settings', onPress: () => Linking.openSettings()},
        ],
      );
      return;
    }

    setDevices([]);
    setScanning(true);
    setModalVisible(true);

    manager.startDeviceScan(null, null, (error, device) => {
      if (error) {
        console.log('Scan error', error);
        setScanning(false);
        return;
      }
      if (!device || !device.name) {
        return;
      }

      setDevices(prev => {
        if (prev.find(d => d.id === device.id)) {
          return prev;
        }
        return [...prev, device];
      });
    });

    setTimeout(() => {
      manager.stopDeviceScan();
      setScanning(false);
    }, 10000);
  };

  const handleSelectDevice = (device: Device) => {
    manager.stopDeviceScan();
    setScanning(false);
    setModalVisible(false);
    navigation.navigate('Device', {device, userEmail});
  };

  const renderItem = ({item}: {item: Device}) => (
    <TouchableOpacity
      style={styles.deviceItemCard}
      onPress={() => handleSelectDevice(item)}
      activeOpacity={0.8}>
      <View style={{flex: 1}}>
        <Text style={styles.deviceName}>{item.name || 'Unnamed Device'}</Text>
        <Text style={styles.deviceId}>{item.id}</Text>
      </View>
      <Text style={styles.deviceArrow}>→</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.homeHeader}>
        <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
          <View>
            <Text style={styles.appTitleLarge}>💪 Neonflake Gym</Text>
            <Text style={styles.appSubtitleSmall}>Your Personal Home Gym</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('History', {userEmail})} style={{padding: 8}}>
            <Text style={{color: '#0ea5e9', fontWeight: '800'}}>History</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.centerArea}>
        <View style={styles.scanButtonContainer}>
          <TouchableOpacity
            style={[styles.bigScanButton, scanning && styles.bigScanButtonScanning]}
            onPress={startScan}
            disabled={scanning}
            activeOpacity={0.85}>
            <Text style={styles.scanIconText}>{scanning ? '⏳' : '🚀'}</Text>
            <Text style={styles.bigScanText}>
              {scanning ? 'SCANNING...' : 'START WORKOUT'}
            </Text>
            <Text style={styles.scanSubText}>Connect to your device</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          manager.stopDeviceScan();
          setModalVisible(false);
          setScanning(false);
        }}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📡 Available Devices</Text>
              <TouchableOpacity
                onPress={() => {
                  manager.stopDeviceScan();
                  setModalVisible(false);
                  setScanning(false);
                }}
                activeOpacity={0.7}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={devices}
              keyExtractor={item => item.id}
              renderItem={renderItem}
              contentContainerStyle={styles.list}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyIconText}>{scanning ? '🔍' : '📭'}</Text>
                  <Text style={styles.emptyText}>
                    {scanning
                      ? 'Scanning for devices...'
                      : 'No devices found. Make sure your device is powered on.'}
                  </Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/* ----------------- Device / Exercise List Screen ----------------- */

const EXERCISES = [
  {id: 'biceps', name: 'Biceps'},
  {id: 'triceps', name: 'Triceps'},
  {id: 'back', name: 'Back'},
  {id: 'chest', name: 'Chest'},
  {id: 'legs', name: 'Legs'},
];

function DeviceScreen({route, navigation}: DeviceProps) {
  const {device, userEmail} = route.params;
  const [status, setStatus] = useState<'Connecting' | 'Connected' | 'Failed'>(
    'Connecting',
  );
  const [bleChar, setBleChar] = useState<Characteristic | null>(null);

  useEffect(() => {
    const connect = async () => {
      setStatus('Connecting');
      try {
        const connected = await manager.connectToDevice(device.id, {
          autoConnect: false,
        });
        await connected.discoverAllServicesAndCharacteristics();

        const services = await connected.services();
        const service = services.find(
          s =>
            s.uuid.toLowerCase() ===
            '12345678-1234-1234-1234-1234567890ab',
        );
        if (!service) {
          setStatus('Failed');
          return;
        }

        const chars = await connected.characteristicsForService(service.uuid);
        const char = chars.find(
          c =>
            c.uuid.toLowerCase() ===
            'abcdefab-1234-5678-1234-abcdefabcdef',
        );
        if (!char) {
          setStatus('Failed');
          return;
        }

        setBleChar(char);
        setStatus('Connected');
      } catch (e) {
        console.log('Connect error', e);
        setStatus('Failed');
      }
    };

    connect();

    return () => {
      manager.cancelDeviceConnection(device.id).catch(() => {});
    };
  }, [device.id]);

  const selectExercise = async (exerciseId: string, exerciseName: string) => {
    if (!bleChar) {
      Alert.alert('Not connected', 'Wait for device to connect.');
      return;
    }
    try {
      const payload = `EXERCISE:${exerciseId.toUpperCase()}`;
      await manager.writeCharacteristicWithResponseForDevice(
        device.id,
        bleChar.serviceUUID,
        bleChar.uuid,
        Buffer.from(payload).toString('base64'),
      );

      navigation.navigate('Workout', {
        device,
        deviceId: device.id,
        exerciseId,
        exerciseName,
        serviceUuid: bleChar.serviceUUID,
        characteristicUuid: bleChar.uuid,
        userEmail,
      });
    } catch (e) {
      console.log('Write exercise error', e);
    }
  };

  const statusColor =
    status === 'Connected' ? '#10b981' : status === 'Failed' ? '#ef4444' : '#f59e0b';
  const statusIcon = status === 'Connected' ? '✓' : status === 'Failed' ? '✕' : '⟳';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.deviceHeader}>
        <Text style={styles.appTitleLarge}>⚙️ {device.name || 'Device'}</Text>
        <Text style={styles.appSubtitleSmall}>{device.id}</Text>
      </View>

      <View style={styles.connectionCard}>
        <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 8}}>
          <View
            style={[
              styles.statusIndicator,
              {backgroundColor: statusColor},
            ]}
          />
          <Text style={styles.connectionLabel}>Connection Status</Text>
          <Text style={[styles.statusBadge, {borderColor: statusColor}]}>
            {statusIcon} {status}
          </Text>
        </View>
        <Text style={styles.connectionHint}>
          {status === 'Connected' 
            ? 'Device connected successfully' 
            : status === 'Connecting'
            ? 'Establishing connection...'
            : 'Connection failed'}
        </Text>
      </View>

      <Text style={styles.sectionTitleLarge}>Choose Your Exercise</Text>

      <View style={{marginTop: 12}}>
        {EXERCISES.map((ex, idx) => (
          <TouchableOpacity
            key={ex.id}
            style={[
              styles.exerciseButton,
              idx === EXERCISES.length - 1 && {marginBottom: 0},
            ]}
            onPress={() => selectExercise(ex.id, ex.name)}
            disabled={status !== 'Connected'}
            activeOpacity={0.8}>
            <View style={{flex: 1}}>
              <Text style={styles.exerciseName}>{ex.name}</Text>
              <Text style={styles.exerciseHint}>Tap to start workout</Text>
            </View>
            <Text style={styles.exerciseArrow}>→</Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

/* ----------------- Workout Screen (per exercise) ----------------- */

function WorkoutScreen({route, navigation}: WorkoutProps) {
  const {
    device,
    deviceId,
    exerciseId,
    exerciseName,
    serviceUuid,
    characteristicUuid,
    userEmail,
  } = route.params;
  const [weight, setWeight] = useState(20);
  const [reps, setReps] = useState(10);
  const [timeSec, setTimeSec] = useState(30);

  const sendWorkoutState = async () => {
    try {
      const payload = `EXERCISE:${exerciseId.toUpperCase()};WEIGHT:${weight};REPS:${reps};TIME:${timeSec}`;

      await manager.writeCharacteristicWithResponseForDevice(
        deviceId,
        serviceUuid,
        characteristicUuid,
        Buffer.from(payload).toString('base64'),
      );

      navigation.navigate('ActiveWorkout', {
        device,
        deviceId,
        exerciseId,
        exerciseName,
        weight,
        targetReps: reps,
        targetTime: timeSec,
        serviceUuid,
        characteristicUuid,
        userEmail,
      });
    } catch (e) {
      console.log('Write workout error', e);
      Alert.alert('Error', 'Could not send workout to device.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.workoutHeader}>
        <Text style={styles.appTitleLarge}>🏋️ {exerciseName}</Text>
        <Text style={styles.appSubtitleSmall}>Configure your set</Text>
      </View>

      <View style={styles.currentSetCard}>
        <Text style={styles.currentSetLabel}>Current Set</Text>
        <Text style={styles.currentSetValue}>
          {weight} kg • {reps} reps • {timeSec}s
        </Text>
        <View style={styles.setStats}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{weight}</Text>
            <Text style={styles.statLabel}>Weight (kg)</Text>
          </View>
          <View style={[styles.statItem, {borderLeftWidth: 1, borderLeftColor: '#334155'}]}>
            <Text style={styles.statValue}>{reps}</Text>
            <Text style={styles.statLabel}>Reps</Text>
          </View>
          <View style={[styles.statItem, {borderLeftWidth: 1, borderLeftColor: '#334155'}]}>
            <Text style={styles.statValue}>{timeSec}</Text>
            <Text style={styles.statLabel}>Time (s)</Text>
          </View>
        </View>
      </View>

      <View style={{marginTop: 32}}>
        <View style={styles.controlSection}>
          <Text style={styles.controlLabel}>💪 Weight</Text>
          <Text style={styles.controlValue}>{weight} kg</Text>
          <Slider
            style={{width: '100%', height: 40, marginTop: 12}}
            minimumValue={0}
            maximumValue={100}
            step={1}
            minimumTrackTintColor="#0ea5e9"
            maximumTrackTintColor="#1e293b"
            thumbTintColor="#0ea5e9"
            value={weight}
            onValueChange={setWeight}
          />
          <View style={styles.rangeHint}>
            <Text style={styles.rangeText}>0 kg</Text>
            <Text style={styles.rangeText}>100 kg</Text>
          </View>
        </View>

        <View style={styles.controlSection}>
          <Text style={styles.controlLabel}>📊 Reps</Text>
          <View style={{flexDirection: 'row', marginTop: 12, flexWrap: 'wrap'}}>
            {[8, 10, 12, 15].map(r => (
              <TouchableOpacity
                key={r}
                style={[
                  styles.optionChip,
                  reps === r && styles.optionChipActive,
                ]}
                onPress={() => setReps(r)}
                activeOpacity={0.7}>
                <Text
                  style={[
                    styles.optionChipText,
                    reps === r && styles.optionChipTextActive,
                  ]}>
                  {r}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.controlSection}>
          <Text style={styles.controlLabel}>⏱️ Time Under Tension</Text>
          <View style={{flexDirection: 'row', marginTop: 12, flexWrap: 'wrap'}}>
            {[20, 30, 40, 60].map(t => (
              <TouchableOpacity
                key={t}
                style={[
                  styles.optionChip,
                  timeSec === t && styles.optionChipActive,
                ]}
                onPress={() => setTimeSec(t)}
                activeOpacity={0.7}>
                <Text
                  style={[
                    styles.optionChipText,
                    timeSec === t && styles.optionChipTextActive,
                  ]}>
                  {t}s
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      <View style={{marginTop: 'auto', marginBottom: 8}}>
        <TouchableOpacity
          style={styles.buttonStartSet}
          onPress={sendWorkoutState}
          activeOpacity={0.85}>
          <Text style={styles.buttonStartSetText}> START SET</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

/* ===== Active Workout Screen ===== */

function ActiveWorkoutScreen({route, navigation}: ActiveWorkoutProps) {
  const {
    device,
    deviceId,
    exerciseId,
    exerciseName,
    weight,
    targetReps,
    targetTime,
    serviceUuid,
    characteristicUuid,
    userEmail,
  } = route.params;

  const [timeRemaining, setTimeRemaining] = useState(targetTime);
  const [currentReps, setCurrentReps] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [setComplete, setSetComplete] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);

  useEffect(() => {
    if (!isActive || setComplete) return;

    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          setIsActive(false);
          setSetComplete(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, setComplete]);

  const handleAddRep = () => {
    if (currentReps < targetReps) {
      setCurrentReps(currentReps + 1);
    }
  };

  const handleRemoveRep = () => {
    if (currentReps > 0) {
      setCurrentReps(currentReps - 1);
    }
  };

  const handleFinishSet = () => {
    setIsActive(false);
    setSetComplete(true);
    setShowCompletionModal(true);
    
    // Post to backend in background
    (async () => {
      try {
        const payload = {
          user_id: userEmail,
          device_id: deviceId,
          exercise: exerciseName,
          weight,
          target_reps: targetReps,
          actual_reps: currentReps,
          target_time: targetTime,
          actual_time: targetTime - timeRemaining,
        };
        await postWorkout(payload);
        console.log('Workout posted to backend');
      } catch (e) {
        console.warn('Failed to post workout', e);
      }
    })();
  };

  const repProgress = (currentReps / targetReps) * 100;
  const timeProgress = ((targetTime - timeRemaining) / targetTime) * 100;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <SafeAreaView style={styles.containerFlex}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.activeWorkoutHeader}>
          <Text style={styles.appTitleLarge}>🏋️ {exerciseName}</Text>
          <Text style={styles.appSubtitleSmall}>Active Set • {weight} kg</Text>
        </View>

        {/* Time Display */}
        <View style={styles.timerCard}>
        <Text style={styles.timerLabel}>⏱️ Time Under Tension</Text>
        <Text style={styles.timerValue}>{formatTime(timeRemaining)}</Text>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              {width: `${timeProgress}%`, backgroundColor: '#0ea5e9'},
            ]}
          />
        </View>
        <Text style={styles.timerSubtext}>
          {timeRemaining}s remaining
        </Text>
      </View>

      {/* Rep Counter Display */}
      <View style={styles.repCard}>
        <Text style={styles.repLabel}>💪 Rep Count</Text>
        <Text style={styles.repValue}>
          {currentReps} <Text style={styles.repTarget}>/ {targetReps}</Text>
        </Text>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              {width: `${repProgress}%`, backgroundColor: '#10b981'},
            ]}
          />
        </View>
      </View>

      {/* Rep Counter Buttons */}
      <View style={styles.repControlsContainer}>
        <TouchableOpacity
          style={styles.repButton}
          onPress={handleRemoveRep}
          activeOpacity={0.7}>
          <Text style={styles.repButtonText}>−</Text>
        </TouchableOpacity>

        <View style={styles.repDisplayCard}>
          <Text style={styles.repDisplayValue}>{currentReps}</Text>
          <Text style={styles.repDisplayLabel}>Reps Done</Text>
        </View>

        <TouchableOpacity
          style={styles.repButtonAdd}
          onPress={handleAddRep}
          activeOpacity={0.7}>
          <Text style={styles.repButtonText}>+</Text>
        </TouchableOpacity>
      </View>

        {/* Status Card */}
        <View style={styles.statusCardActive}>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Weight</Text>
            <Text style={styles.statusValue}>{weight} kg</Text>
          </View>
          <View style={[styles.statusRow, {borderTopWidth: 1, borderTopColor: '#2a3142', paddingTop: 12}]}>
            <Text style={styles.statusLabel}>Status</Text>
            <Text style={styles.statusValueActive}>
              {setComplete ? '✓ Complete' : isActive ? '● Active' : '⏸ Paused'}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Finish Button - Sticky at bottom */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.buttonFinishSet}
          onPress={handleFinishSet}
          activeOpacity={0.85}>
          <Text style={styles.buttonFinishSetText}>✓ FINISH SET</Text>
        </TouchableOpacity>
      </View>

      {/* Completion Modal */}
      <Modal
        visible={showCompletionModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCompletionModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.completionModal}>
            {/* Success Icon */}
            <View style={styles.successIconContainer}>
              <Text style={styles.successIcon}>✓</Text>
            </View>

            {/* Title */}
            <Text style={styles.completionTitle}>Awesome!</Text>
            <Text style={styles.completionSubtitle}>Set Complete 🎉</Text>

            {/* Exercise Card */}
            <View style={styles.exerciseInfoCard}>
              <Text style={styles.exerciseInfoLabel}>Exercise</Text>
              <Text style={styles.exerciseInfoName}>{exerciseName}</Text>
            </View>

            {/* Stats Container */}
            <View style={styles.statsContainer}>
              <View style={styles.statBox}>
                <Text style={styles.statBoxLabel}>Reps Done</Text>
                <Text style={styles.statBoxValue}>{currentReps}</Text>
                <Text style={styles.statBoxSubtext}>of {targetReps}</Text>
              </View>

              <View style={styles.statBox}>
                <Text style={styles.statBoxLabel}>Weight</Text>
                <Text style={styles.statBoxValue}>{weight}</Text>
                <Text style={styles.statBoxSubtext}>kg</Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.completionButtonsContainer}>
              <TouchableOpacity
                style={styles.completionButtonSecondary}
                onPress={() => {
                  setShowCompletionModal(false);
                  navigation.pop();
                  navigation.pop();
                }}
                activeOpacity={0.8}>
                <Text style={styles.completionButtonSecondaryText}>← Exercise List</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.completionButtonPrimary}
                onPress={() => {
                  setShowCompletionModal(false);
                  navigation.pop();
                }}
                activeOpacity={0.8}>
                <Text style={styles.completionButtonPrimaryText}>Another Set →</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/* ----------------- Navigator root ----------------- */

const Stack = createNativeStackNavigator<RootStackParamList>();

function PermissionGate() {
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [bluetoothEnabled, setBluetoothEnabled] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [modalType, setModalType] = useState<'permission' | 'bluetooth' | 'location'>('permission');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkPermissions();
  }, []);

  useEffect(() => {
    if (!permissionsGranted) return;

    const checkBluetoothState = async () => {
      const state = await manager.state();
      setBluetoothEnabled(state === State.PoweredOn);
      if (state !== State.PoweredOn) {
        setModalType('bluetooth');
        setShowPermissionModal(true);
      } else {
        setShowPermissionModal(false);
      }
    };

    checkBluetoothState();

    const subscription = manager.onStateChange(newState => {
      const isPoweredOn = newState === State.PoweredOn;
      setBluetoothEnabled(isPoweredOn);
      if (isPoweredOn) {
        setShowPermissionModal(false);
      } else {
        setModalType('bluetooth');
        setShowPermissionModal(true);
      }
    }, true);

    return () => subscription.remove();
  }, [permissionsGranted]);

  const checkPermissions = async () => {
    const result = await checkAndRequestPermissions();
    
    if (result.bluetooth && result.location) {
      setPermissionsGranted(true);
      setLoading(false);
    } else {
      setModalType('permission');
      setShowPermissionModal(true);
      setLoading(false);
    }
  };

  const handleRetry = async () => {
    setLoading(true);
    await checkPermissions();
  };

  if (loading) {
    return (
      <SafeAreaView style={{flex: 1, backgroundColor: '#0f1419', justifyContent: 'center', alignItems: 'center'}}>
        <View style={{alignItems: 'center'}}>
          <Text style={{color: '#0ea5e9', fontSize: 24, fontWeight: '800', marginBottom: 16}}>
            Loading...
          </Text>
          <Text style={{color: '#94a3b8', fontSize: 14, fontWeight: '500'}}>
            Checking permissions
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (showPermissionModal) {
    const isPermissionIssue = modalType === 'permission';
    const isBluetoothIssue = modalType === 'bluetooth';

    return (
      <SafeAreaView style={{flex: 1, backgroundColor: '#0f1419'}}>
        <Modal visible={showPermissionModal} transparent animationType="fade">
          <View style={{flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16}}>
            <View style={{backgroundColor: '#1a1f2e', borderRadius: 24, paddingHorizontal: 24, paddingVertical: 36, alignItems: 'center', borderWidth: 2, borderColor: isBluetoothIssue ? '#ef4444' : '#0ea5e9', maxWidth: 360, shadowColor: isBluetoothIssue ? '#ef4444' : '#0ea5e9', shadowOffset: {width: 0, height: 12}, shadowOpacity: 0.5, shadowRadius: 20, elevation: 15}}>
              {/* Icon */}
              <View style={{width: 80, height: 80, borderRadius: 40, backgroundColor: isBluetoothIssue ? '#ef4444' : '#0ea5e9', justifyContent: 'center', alignItems: 'center', marginBottom: 24}}>
                <Text style={{fontSize: 44, fontWeight: '900'}}>
                  {isPermissionIssue ? '🔐' : '📡'}
                </Text>
              </View>

              {/* Title */}
              <Text style={{color: '#ffffff', fontSize: 28, fontWeight: '900', marginBottom: 12}}>
                {isPermissionIssue ? 'Permissions Required' : 'Bluetooth Disabled'}
              </Text>

              {/* Description */}
              <Text style={{color: '#94a3b8', fontSize: 14, fontWeight: '500', marginBottom: 24, textAlign: 'center', lineHeight: 20}}>
                {isPermissionIssue 
                  ? 'This app needs Bluetooth and Location permissions to work properly.'
                  : 'Please enable Bluetooth on your device to continue using this app.'}
              </Text>

              {/* Permissions List */}
              {isPermissionIssue && (
                <View style={{width: '100%', backgroundColor: '#0f1419', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 14, marginBottom: 28, borderWidth: 1.5, borderColor: '#2a3142'}}>
                  <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 12}}>
                    <Text style={{fontSize: 20, marginRight: 10}}>📡</Text>
                    <Text style={{color: '#cbd5e1', fontSize: 14, fontWeight: '600', flex: 1}}>Bluetooth</Text>
                    <Text style={{color: '#0ea5e9', fontSize: 12, fontWeight: '700'}}>Required</Text>
                  </View>
                  <View style={{flexDirection: 'row', alignItems: 'center'}}>
                    <Text style={{fontSize: 20, marginRight: 10}}>📍</Text>
                    <Text style={{color: '#cbd5e1', fontSize: 14, fontWeight: '600', flex: 1}}>Location</Text>
                    <Text style={{color: '#0ea5e9', fontSize: 12, fontWeight: '700'}}>Required</Text>
                  </View>
                </View>
              )}

              {/* Button */}
              <TouchableOpacity
                style={{width: '100%', paddingVertical: 15, borderRadius: 12, backgroundColor: isBluetoothIssue ? '#ef4444' : '#0ea5e9', alignItems: 'center', shadowColor: isBluetoothIssue ? '#ef4444' : '#0ea5e9', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.4, shadowRadius: 8, elevation: 6}}
                onPress={isBluetoothIssue ? () => Linking.openSettings() : handleRetry}>
                <Text style={{color: '#ffffff', fontSize: 15, fontWeight: '800', letterSpacing: 0.3}}>
                  {isBluetoothIssue ? 'Open Settings' : 'Grant Permissions'}
                </Text>
              </TouchableOpacity>

              {isBluetoothIssue && (
                <TouchableOpacity
                  style={{width: '100%', paddingVertical: 14, borderRadius: 12, backgroundColor: '#2a3142', alignItems: 'center', borderWidth: 1.5, borderColor: '#3d4654', marginTop: 10}}
                  onPress={() => checkPermissions()}>
                  <Text style={{color: '#0ea5e9', fontSize: 15, fontWeight: '800', letterSpacing: 0.3}}>
                    Retry
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  return <Stack.Navigator initialRouteName="Login" screenOptions={{headerShown: false}}>
    <Stack.Screen name="Login" component={LocalLoginScreen} />
    <Stack.Screen name="Home" component={HomeScreen} />
    <Stack.Screen name="History" component={HistoryScreen} />
    <Stack.Screen name="Device" component={DeviceScreen} />
    <Stack.Screen name="Workout" component={WorkoutScreen} />
    <Stack.Screen name="ActiveWorkout" component={ActiveWorkoutScreen} />
  </Stack.Navigator>;
}

export default function App() {
  return <PermissionGate />;
}

/* ----------------- History Screen ----------------- */

function HistoryScreen({ navigation, route }: HistoryProps) {
  const {userEmail} = route.params;
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('Loading history for:', userEmail);
      const res = await fetchHistory(userEmail);
      console.log('Got response:', res);
      setItems(res || []);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn('History load failed', msg);
      setError(msg);
    }
    setLoading(false);
  };

  useEffect(() => {
    const unsub = navigation.addListener('focus', () => {
      load();
    });
    load();
    return unsub;
  }, [navigation]);

  const renderItem = ({ item }: { item: any }) => (
    <View style={{padding: 12, marginBottom: 10, borderRadius: 12, backgroundColor: '#1a1f2e', borderWidth:1.5, borderColor:'#2a3142'}}>
      <Text style={{color:'#cbd5e1', fontWeight:'700', fontSize:16}}>{item.exercise}</Text>
      <Text style={{color:'#94a3b8', fontSize:12, marginTop:6}}>{new Date(item.timestamp).toLocaleString()}</Text>
      <View style={{flexDirection:'row', justifyContent:'space-between', marginTop:8}}>
        <Text style={{color:'#0ea5e9', fontWeight:'800'}}>{item.actual_reps} / {item.target_reps} reps</Text>
        <Text style={{color:'#10b981', fontWeight:'800'}}>{item.weight} kg</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.workoutHeader}>
        <Text style={styles.appTitleLarge}>📜 History</Text>
        <Text style={styles.appSubtitleSmall}>Recent workouts</Text>
      </View>

      {loading ? (
        <View style={{flex:1, justifyContent:'center', alignItems:'center'}}>
          <ActivityIndicator color="#0ea5e9" size="large" />
          <Text style={{color:'#94a3b8', marginTop: 12}}>Loading...</Text>
        </View>
      ) : error ? (
        <View style={{flex:1, justifyContent:'center', alignItems:'center', paddingHorizontal: 16}}>
          <Text style={{color:'#ef4444', fontSize: 16, fontWeight:'700', marginBottom: 16}}>Error Loading History</Text>
          <Text style={{color:'#94a3b8', textAlign:'center', marginBottom: 20}}>{error}</Text>
          <TouchableOpacity onPress={load} style={{paddingVertical: 10, paddingHorizontal: 20, backgroundColor:'#0ea5e9', borderRadius: 8}}>
            <Text style={{color:'#ffffff', fontWeight:'800'}}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => String(i.id)}
          renderItem={renderItem}
          contentContainerStyle={{padding: 16}}
          ListEmptyComponent={<View style={{alignItems:'center', paddingTop:40}}><Text style={{color:'#94a3b8'}}>No history yet.</Text></View>}
        />
      )}
    </SafeAreaView>
  );
}

/* ----------------- Styles ----------------- */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f1419',
    paddingHorizontal: 16,
    paddingVertical: 0,
  },

  containerFlex: {
    flex: 1,
    backgroundColor: '#0f1419',
  },

  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 0,
  },

  buttonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#0f1419',
    borderTopWidth: 1,
    borderTopColor: '#1a1f2e',
  },

  /* ===== Typography ===== */
  appTitleLarge: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  appSubtitleLarge: {
    color: '#cbd5e1',
    fontSize: 15,
    marginTop: 6,
    fontWeight: '500',
  },
  appSubtitleSmall: {
    color: '#94a3b8',
    fontSize: 13,
    marginTop: 4,
  },
  appDescriptionText: {
    color: '#64748b',
    fontSize: 14,
    marginTop: 16,
    fontWeight: '500',
  },

  sectionTitleLarge: {
    color: '#f1f5f9',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 28,
    marginBottom: 4,
  },

  formLabel: {
    color: '#cbd5e1',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 8,
  },

  /* ===== Login Screen ===== */
  loginHeader: {
    paddingTop: 20,
    paddingBottom: 12,
  },

  inputField: {
    width: '100%',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#1a1f2e',
    borderWidth: 2,
    borderColor: '#2a3142',
    color: '#ffffff',
    fontSize: 15,
    marginBottom: 12,
    fontWeight: '500',
  },

  inputFieldFocused: {
    borderColor: '#0ea5e9',
    backgroundColor: '#1a1f2e',
  },

  buttonPrimary: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#0ea5e9',
    alignItems: 'center',
    marginTop: 32,
    shadowColor: '#0ea5e9',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },

  buttonPrimaryText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  /* ===== Home Screen ===== */
  homeHeader: {
    paddingVertical: 20,
    paddingBottom: 8,
  },

  centerArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  scanButtonContainer: {
    width: '100%',
    alignItems: 'center',
  },

  bigScanButton: {
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: '#0ea5e9',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0ea5e9',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },

  bigScanButtonScanning: {
    backgroundColor: '#06b6d4',
  },

  scanIconText: {
    fontSize: 56,
    marginBottom: 8,
  },

  bigScanText: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.5,
  },

  scanSubText: {
    color: '#e0f2fe',
    fontSize: 12,
    marginTop: 8,
    fontWeight: '500',
  },

  /* ===== Modal ===== */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },

  modalContent: {
    backgroundColor: '#0f1419',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 20,
    maxHeight: '90%',
    paddingBottom: 20,
  },

  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },

  modalTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
  },

  modalClose: {
    color: '#64748b',
    fontSize: 24,
    fontWeight: '600',
  },

  list: {
    paddingBottom: 16,
  },

  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },

  emptyIconText: {
    fontSize: 48,
    marginBottom: 12,
  },

  emptyText: {
    color: '#94a3b8',
    fontSize: 15,
    textAlign: 'center',
    fontWeight: '500',
  },

  deviceItemCard: {
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#1a1f2e',
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: '#2a3142',
    flexDirection: 'row',
    alignItems: 'center',
  },

  deviceName: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },

  deviceId: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },

  deviceArrow: {
    color: '#0ea5e9',
    fontSize: 18,
    fontWeight: '600',
  },

  /* ===== Device Screen ===== */
  deviceHeader: {
    paddingVertical: 20,
    paddingBottom: 8,
  },

  connectionCard: {
    backgroundColor: '#1a1f2e',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginTop: 16,
    marginBottom: 24,
    borderWidth: 1.5,
    borderColor: '#2a3142',
  },

  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },

  connectionLabel: {
    color: '#cbd5e1',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },

  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1.5,
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '600',
  },

  connectionHint: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 8,
  },

  exerciseButton: {
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#1a1f2e',
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: '#2a3142',
    flexDirection: 'row',
    alignItems: 'center',
  },

  exerciseName: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },

  exerciseHint: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 4,
  },

  exerciseArrow: {
    color: '#0ea5e9',
    fontSize: 18,
    fontWeight: '600',
  },

  /* ===== Workout Screen ===== */
  workoutHeader: {
    paddingVertical: 20,
    paddingBottom: 8,
  },

  currentSetCard: {
    backgroundColor: 'linear-gradient(135deg, #1a1f2e 0%, #2a3142 100%)',
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginTop: 16,
    borderWidth: 1.5,
    borderColor: '#2a3142',
    marginBottom: 8,
  },

  currentSetLabel: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },

  currentSetValue: {
    color: '#0ea5e9',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 16,
    letterSpacing: -0.5,
  },

  setStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
  },

  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },

  statValue: {
    color: '#0ea5e9',
    fontSize: 24,
    fontWeight: '800',
  },

  statLabel: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 4,
    fontWeight: '600',
  },

  controlSection: {
    marginBottom: 24,
  },

  controlLabel: {
    color: '#f1f5f9',
    fontSize: 16,
    fontWeight: '700',
  },

  controlValue: {
    color: '#0ea5e9',
    fontSize: 20,
    fontWeight: '800',
    marginTop: 4,
  },

  rangeHint: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },

  rangeText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '500',
  },

  optionChip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#1a1f2e',
    borderWidth: 1.5,
    borderColor: '#2a3142',
    marginRight: 10,
    marginBottom: 8,
  },

  optionChipActive: {
    backgroundColor: '#0ea5e9',
    borderColor: '#0ea5e9',
  },

  optionChipText: {
    color: '#cbd5e1',
    fontWeight: '700',
    fontSize: 14,
  },

  optionChipTextActive: {
    color: '#ffffff',
    fontWeight: '800',
  },

  buttonStartSet: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#10b981',
    alignItems: 'center',
    shadowColor: '#10b981',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },

  buttonStartSetText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  /* ===== Active Workout Screen ===== */
  activeWorkoutHeader: {
    paddingVertical: 20,
    paddingBottom: 8,
  },

  timerCard: {
    backgroundColor: '#1a1f2e',
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginTop: 20,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: '#2a3142',
  },

  timerLabel: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
  },

  timerValue: {
    color: '#0ea5e9',
    fontSize: 56,
    fontWeight: '800',
    marginBottom: 16,
    letterSpacing: -1,
  },

  timerSubtext: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 10,
    fontWeight: '500',
  },

  repCard: {
    backgroundColor: '#1a1f2e',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: '#2a3142',
  },

  repLabel: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },

  repValue: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: '800',
  },

  repTarget: {
    color: '#64748b',
    fontSize: 24,
    fontWeight: '600',
  },

  progressBar: {
    width: '100%',
    height: 6,
    backgroundColor: '#2a3142',
    borderRadius: 3,
    marginTop: 12,
    overflow: 'hidden',
  },

  progressFill: {
    height: '100%',
    borderRadius: 3,
  },

  repControlsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 12,
  },

  repButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#ef4444',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },

  repButtonAdd: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#10b981',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },

  repButtonText: {
    color: '#ffffff',
    fontSize: 36,
    fontWeight: '800',
  },

  repDisplayCard: {
    flex: 1,
    backgroundColor: '#1a1f2e',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#2a3142',
    alignItems: 'center',
  },

  repDisplayValue: {
    color: '#0ea5e9',
    fontSize: 44,
    fontWeight: '800',
  },

  repDisplayLabel: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },

  statusCardActive: {
    backgroundColor: '#1a1f2e',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#2a3142',
  },

  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },

  statusLabel: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '600',
  },

  statusValue: {
    color: '#0ea5e9',
    fontSize: 16,
    fontWeight: '800',
  },

  statusValueActive: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '700',
  },

  buttonFinishSet: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#06b6d4',
    alignItems: 'center',
    shadowColor: '#06b6d4',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    marginBottom: 12,
  },

  buttonFinishSetText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  /* ===== Completion Modal ===== */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },

  completionModal: {
    backgroundColor: '#1a1f2e',
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 36,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#10b981',
    shadowColor: '#10b981',
    shadowOffset: {width: 0, height: 12},
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 15,
    maxWidth: 360,
  },

  successIconContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#10b981',
    shadowOffset: {width: 0, height: 6},
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },

  successIcon: {
    fontSize: 52,
    color: '#ffffff',
    fontWeight: '900',
  },

  completionTitle: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginBottom: 4,
  },

  completionSubtitle: {
    color: '#10b981',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 28,
  },

  exerciseInfoCard: {
    width: '100%',
    backgroundColor: '#0f1419',
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 14,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: '#2a3142',
    alignItems: 'center',
  },

  exerciseInfoLabel: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },

  exerciseInfoName: {
    color: '#0ea5e9',
    fontSize: 22,
    fontWeight: '800',
  },

  statsContainer: {
    width: '100%',
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },

  statBox: {
    flex: 1,
    backgroundColor: '#0f1419',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderColor: '#2a3142',
    alignItems: 'center',
  },

  statBoxLabel: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 8,
  },

  statBoxValue: {
    color: '#10b981',
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 32,
  },

  statBoxSubtext: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '500',
    marginTop: 4,
  },

  completionButtonsContainer: {
    width: '100%',
    gap: 10,
  },

  completionButtonPrimary: {
    width: '100%',
    paddingVertical: 15,
    borderRadius: 12,
    backgroundColor: '#10b981',
    alignItems: 'center',
    shadowColor: '#10b981',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },

  completionButtonPrimaryText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },

  completionButtonSecondary: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#2a3142',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#3d4654',
  },

  completionButtonSecondaryText: {
    color: '#0ea5e9',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },

  completionStatsGrid: {
    width: '100%',
    marginBottom: 28,
    gap: 12,
  },

  completionStatCard: {
    width: '100%',
    backgroundColor: '#0f1419',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: '#2a3142',
    alignItems: 'center',
    justifyContent: 'center',
  },

  completionStatCardSmall: {
    flex: 1,
    paddingVertical: 12,
  },

  completionStatsRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },

  completionStatLabel: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
  },

  completionStatValue: {
    color: '#10b981',
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 28,
  },

  completionStatValueLarge: {
    color: '#0ea5e9',
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
  },

  completionStatSubtext: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
    textAlign: 'center',
  },

  completionDivider: {
    height: 1,
    backgroundColor: '#2a3142',
    marginVertical: 14,
  },

  completionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },

  completionCol: {
    alignItems: 'center',
  },

  completionInfo: {
    width: '100%',
    backgroundColor: '#0f1419',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 24,
    borderWidth: 1.5,
    borderColor: '#2a3142',
  },

  completionLabel: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },

  completionValue: {
    color: '#0ea5e9',
    fontSize: 20,
    fontWeight: '800',
  },
});
