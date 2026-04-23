/**
 * Creates Playwright test users 1-N in Firebase Auth + Firestore.
 *
 * Usage:
 *   node tests/seed-test-users.js           # creates users 1-100 (default)
 *   node tests/seed-test-users.js 10        # creates users 1-10
 *   node tests/seed-test-users.js 1 5       # creates users 1-5 (from, to)
 *
 * User format:
 *   phone : 9000000001 + (n-1)  →  9000000001 … 9000000100
 *   pass  : TestPass{n}!
 *   alias : Tester_{n:03d}  →  Tester_001 … Tester_100
 *
 * Safe to re-run — existing users are skipped.
 */

const { initializeApp } = require('firebase/app');
const { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, doc, setDoc, serverTimestamp } = require('firebase/firestore');
const fs = require('fs');
const path = require('path');

// Load .env.test
function loadEnv(file) {
  const envPath = path.join(__dirname, '..', file);
  if (!fs.existsSync(envPath)) {
    console.error(`Missing ${file} — copy .env.test.example to .env.test and fill in values`);
    process.exit(1);
  }
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  const env = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [key, ...rest] = trimmed.split('=');
    env[key.trim()] = rest.join('=').trim();
  }
  return env;
}

// Load Firebase config from .env (EXPO_PUBLIC_ prefix)
function loadFirebaseConfig(env) {
  return {
    apiKey:            env['EXPO_PUBLIC_FIREBASE_API_KEY'],
    authDomain:        env['EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN'],
    projectId:         env['EXPO_PUBLIC_FIREBASE_PROJECT_ID'],
    storageBucket:     env['EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET'],
    messagingSenderId: env['EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'],
    appId:             env['EXPO_PUBLIC_FIREBASE_APP_ID'],
  };
}

/** Generate canonical user descriptor for user index n (1-based) */
function userSpec(n) {
  const phone = String(9000000000 + n);
  return {
    phone,
    pass:  `TestPass${n}!`,
    alias: `Tester_${String(n).padStart(3, '0')}`,
    email: `${phone}@ventspace.app`,
  };
}

async function createUser(auth, db, spec) {
  let uid;
  try {
    const cred = await createUserWithEmailAndPassword(auth, spec.email, spec.pass);
    uid = cred.user.uid;
    console.log(`✅ Created: ${spec.alias} (${spec.email})`);
  } catch (err) {
    if (err.code === 'auth/email-already-in-use') {
      const cred = await signInWithEmailAndPassword(auth, spec.email, spec.pass);
      uid = cred.user.uid;
      console.log(`⏭️  Exists:  ${spec.alias} (${spec.email})`);
    } else {
      throw err;
    }
  }

  await setDoc(doc(db, 'users', uid), {
    alias: spec.alias,
    createdAt: serverTimestamp(),
  }, { merge: true });

  return uid;
}

async function main() {
  // CLI: seed-test-users.js [to] or [from to]
  const args = process.argv.slice(2).map(Number).filter(n => !isNaN(n) && n > 0);
  let from = 1, to = 100;
  if (args.length === 1) to = args[0];
  else if (args.length >= 2) { from = args[0]; to = args[1]; }

  const testEnv  = loadEnv('.env.test');
  const envPath  = path.join(__dirname, '..', '.env');
  const firebaseEnv = fs.existsSync(envPath) ? loadEnv('.env') : testEnv;
  const config = loadFirebaseConfig(firebaseEnv);
  if (!config.apiKey) {
    console.error('Firebase config missing — add EXPO_PUBLIC_FIREBASE_* to .env or .env.test');
    process.exit(1);
  }

  const app  = initializeApp(config, 'seed');
  const auth = getAuth(app);
  const db   = getFirestore(app);

  console.log(`Creating users ${from}–${to} …\n`);
  for (let n = from; n <= to; n++) {
    await createUser(auth, db, userSpec(n));
  }

  console.log('\n✅ All test users ready.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
