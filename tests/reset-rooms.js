/**
 * Cleanup script: resets zombie memberCounts in all Anxiety subrooms.
 * Run once: node tests/reset-rooms.js
 */
const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const {
  getFirestore, collection, getDocs, writeBatch, doc
} = require('firebase/firestore');
const fs = require('fs');
const path = require('path');

function loadEnv(file) {
  const envPath = path.join(__dirname, '..', file);
  if (!fs.existsSync(envPath)) { console.error('Missing', file); process.exit(1); }
  const env = {};
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const [k, ...v] = t.split('=');
    env[k.trim()] = v.join('=').trim();
  }
  return env;
}

async function main() {
  const testEnv = loadEnv('.env.test');
  const mainEnv = fs.existsSync(path.join(__dirname, '..', '.env'))
    ? loadEnv('.env') : testEnv;

  const config = {
    apiKey:            mainEnv['EXPO_PUBLIC_FIREBASE_API_KEY'],
    authDomain:        mainEnv['EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN'],
    projectId:         mainEnv['EXPO_PUBLIC_FIREBASE_PROJECT_ID'],
    storageBucket:     mainEnv['EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET'],
    messagingSenderId: mainEnv['EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'],
    appId:             mainEnv['EXPO_PUBLIC_FIREBASE_APP_ID'],
  };

  const app  = initializeApp(config, 'reset');
  const auth = getAuth(app);
  const db   = getFirestore(app);

  // Sign in as test user 1 to get write access
  await signInWithEmailAndPassword(
    auth,
    `${testEnv['TEST_USER1_PHONE']}@ventspace.app`,
    testEnv['TEST_USER1_PASS'],
  );
  console.log('Signed in as test user');

  // Get all topic keys (anxiety, breakup, work, etc.)
  const topicsSnap = await getDocs(collection(db, 'topics'));
  const topicKeys = topicsSnap.docs.map(d => d.id);
  console.log('Topics found:', topicKeys);

  let totalReset = 0;

  for (const topicKey of topicKeys) {
    const subroomsRef = collection(db, 'rooms', topicKey, 'subrooms');
    const subroomsSnap = await getDocs(subroomsRef);

    if (subroomsSnap.empty) continue;

    for (const subroom of subroomsSnap.docs) {
      const data = subroom.data();
      // Reset memberCount
      if (data.memberCount > 0) {
        console.log(`  Resetting ${topicKey}/${subroom.id} — memberCount was ${data.memberCount}`);
        const batch = writeBatch(db);
        batch.update(doc(db, 'rooms', topicKey, 'subrooms', subroom.id), {
          memberCount: 0,
          members: {},
        });
        await batch.commit();
        totalReset++;
      }
    }
  }

  console.log(`\n✅ Reset ${totalReset} subrooms. Firestore is clean.`);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
