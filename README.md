
---

# 🏋️ HomeGym – BLE-Based Smart Gym Application

This is a **React Native mobile application** for a smart gym system.
The app connects to **BLE gym devices**, tracks workout progress, and **stores workout history securely in Firebase Cloud Firestore**.

This README is written so that **even a complete beginner** can understand, run, and rebuild this project.

---

## 📌 Features

* 🔐 User Login using **Firebase Authentication**
* 📡 Scan & connect to **BLE gym devices**
* 🏋️ Start workouts and track:

  * Exercise name
  * Weight
  * Reps
  * Time
* ☁️ Automatically save workout history to **Firebase Firestore**
* 📱 View workout history inside the app
* 🔁 History syncs across devices (same login)

---

## 🧰 Tech Stack

* **React Native**
* **TypeScript**
* **Firebase Authentication**
* **Firebase Cloud Firestore**
* **Bluetooth Low Energy (BLE)**
* Optional Python backend (for testing)

---

## 📂 Project Folder Structure

```
blescan/
├── android/                # Android native files & permissions
├── ios/                    # iOS native files
├── src/
│   ├── screens/
│   │   └── LoginScreen.tsx # Login UI & logic
│   ├── firebase.js         # Firebase configuration
│   └── firestoreHistory.ts # Firestore save & fetch logic
├── App.tsx                 # Main application logic
├── api.ts                  # Optional backend API calls
├── package.json            # Dependencies
├── README.md               # Project documentation
```

---

## 🚀 How This App Works (Simple Flow)

```
User opens app
   ↓
Login with Email & Password
   ↓
Scan BLE Device
   ↓
Start Workout
   ↓
Finish Set
   ↓
Save Workout to Firestore
   ↓
View Workout History
```

---

## 🔐 Firebase Setup (Required)

### 1️⃣ Create Firebase Project

* Go to: [https://console.firebase.google.com](https://console.firebase.google.com)
* Create a new project (example: `HomeGym`)

### 2️⃣ Enable Authentication

* Go to **Authentication → Sign-in method**
* Enable **Email / Password**

### 3️⃣ Create Firestore Database

* Go to **Firestore Database**
* Create database
* Choose **Production mode**
* Select region (example: Mumbai)

### 4️⃣ Firestore Rules

Use this rule (already tested and working):

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

---

## 📥 Add Firebase to Android

1. Register Android app in Firebase

   * Package name: `com.blescan`

2. Download `google-services.json`

3. Place it here:

```
android/app/google-services.json
```

⚠️ Do NOT commit this file to public repos in real production apps.

---

## ▶️ How to Run the App

### Install dependencies

```bash
npm install
```

### Start Metro bundler

```bash
npx react-native start
```

### Run on Android

```bash
npx react-native run-android
```

---

## 📘 Code Overview (Beginner Friendly)

This section explains **which file does what**, without deep technical details.

---

### 🔹 `App.tsx`

**Main application file**

* Controls app navigation
* Shows Login or Home screen
* Handles:

  * BLE scanning
  * Workout logic
  * Calling Firestore save function
* Entry point for the app

👉 If UI or navigation breaks, check this file first.

---

### 🔹 `src/screens/LoginScreen.tsx`

**Login Screen**

* Takes Email & Password input
* Uses Firebase Authentication
* On success → moves to Home screen
* Shows error messages for wrong credentials

---

### 🔹 `src/firebase.js`

**Firebase Configuration**

* Connects app to Firebase
* Initializes:

  * Firebase Auth
  * Firestore

👉 If Firebase is not working, check this file first.

---

### 🔹 `src/firestoreHistory.ts`

**Firestore Database Logic**

* Saves workout data to Firestore
* Fetches workout history
* Uses logged-in user UID
* Automatically adds timestamp

Example:

```ts
saveWorkoutToFirestore(workoutData);
```

---

### 🔹 `api.ts` (Optional)

**Optional Backend API**

* Sends workout data to local Python backend
* Firestore is the **main database**
* This file can be ignored or removed if not needed

---

### 🔹 `android/`

**Android Native Configuration**

* Bluetooth permissions
* Location permissions
* Firebase native setup

⚠️ Beginners should not modify unless required.

---

## 🗃️ Firestore Data Structure

```
users
 └── {userUID}
     └── workouts
         └── {autoID}
             ├── exercise
             ├── weight
             ├── target_reps
             ├── actual_reps
             ├── target_time
             ├── actual_time
             ├── device_id
             ├── createdAt
```

---

## 🔒 Security Notes

* Only logged-in users can access data
* Each user sees only their own workouts
* Firebase handles security automatically

---

## ⚠️ Known Limitations

* Duplicate history entries may appear (can be optimized later)
* UI can be improved
* Backend server is optional

These do **NOT** affect core functionality.

---

## 🧪 Testing Checklist

✅ Login works
✅ BLE devices appear
✅ Workout saves correctly
✅ History loads correctly
✅ Data persists after app restart
✅ History syncs across devices

---

## 📌 Final Notes

* This project is safe to stop and resume later
* Firebase free tier (Spark plan) is sufficient for testing
* No data loss risk

---

## 👨‍💻 Developer Note

This project focuses on **end-to-end functionality**:

* Firebase integration
* BLE device interaction
* Real-time workout tracking
* Cloud-based history storage

---
👨‍💻 Author

Lokesh Vijjapu
Embedded & Application Developer
Project: HomeGym App