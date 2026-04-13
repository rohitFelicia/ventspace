# VentSpace 💜

A React Native (Expo) mobile app for **anonymous peer-to-peer venting and emotional support**.

Match 1-on-1 with someone going through the same thing, or join a public topic room. No sign-up required.

---

## Features

| | |
|---|---|
| 🤝 **1-on-1 Matching** | Anonymously pair with someone on the same topic via Firestore transactions |
| 💬 **Open Rooms** | Group chat rooms for each topic — anyone can join and vent |
| 👻 **Fully Anonymous** | Firebase Anonymous Auth — no email, no name, no account |
| ⚡ **Real-time** | Firestore listeners power live chat with instant delivery |
| 🔒 **Secure by default** | Firestore security rules enforce message ownership & 500-char limit |

## Topics

- 💔 Heartbreak
- 😤 Work Stress
- 🏠 Family Issues
- 😰 Anxiety
- 💬 Just Venting

---

## Tech Stack

- [Expo](https://expo.dev/) (React Native, managed workflow)
- [Firebase](https://firebase.google.com/) — Anonymous Auth + Firestore
- [React Navigation](https://reactnavigation.org/) — Native Stack
- TypeScript throughout

---

## Setup

### 1. Install dependencies

```bash
cd ventspace
npm install
```

### 2. Create a Firebase project

1. Go to [Firebase Console](https://console.firebase.google.com/) and create a project.
2. Enable **Anonymous Authentication**:  
   `Authentication → Sign-in method → Anonymous → Enable`
3. Create a **Firestore Database**:  
   `Firestore Database → Create database → Start in test mode`
4. Go to **Project Settings → Your apps → Add app (Web)** → copy the config.

### 3. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in your Firebase values in `.env.local`:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...
EXPO_PUBLIC_FIREBASE_PROJECT_ID=...
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=...
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
EXPO_PUBLIC_FIREBASE_APP_ID=...
```

### 4. Deploy Firestore security rules

```bash
npm install -g firebase-tools
firebase login
firebase init firestore   # select your project, accept defaults
# Paste firestore.rules content into the generated firestore.rules file, then:
firebase deploy --only firestore:rules
```

### 5. Run the app

```bash
npx expo start
```

Scan the QR code with [Expo Go](https://expo.dev/client) on your iOS or Android device.

---

## Firestore Data Model

```
matchmaking/{topicKey}
  └── waitingUid: string | null

user_pending_sessions/{userId}
  └── sessionId: string

sessions/{sessionId}
  ├── participants: [uid1, uid2]
  ├── topic: string
  ├── createdAt: timestamp
  ├── active: boolean
  ├── endedBy?: string
  └── messages/{messageId}
      ├── text: string
      ├── senderId: string
      └── timestamp: timestamp

rooms/{topicKey}
  └── messages/{messageId}
      ├── text: string
      ├── senderId: string
      ├── senderAlias: string  (e.g. "Anon#4F2A")
      └── timestamp: timestamp
```

---

## Matchmaking Flow (1-on-1)

```
User A taps "Talk 1-on-1" → picks topic
  └── Firestore transaction reads matchmaking/{topic}
      ├── Queue empty?  → write my UID as waitingUid, listen for user_pending_sessions/{myUid}
      └── Someone waiting? → create session, notify them via user_pending_sessions/{theirUid},
                             clear the queue, navigate to Chat directly
```

Both users are navigated to `ChatScreen` once a session is created.

---

## Roadmap / Nice-to-haves

- [ ] Push notifications when matched
- [ ] Message reactions (❤️ 🫂 💪)
- [ ] Typing indicators
- [ ] Report / block a user
- [ ] Room participant count badges
- [ ] Crisis resource banner (Samaritans, etc.)
