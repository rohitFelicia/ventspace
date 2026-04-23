/**
 * Deletes all messages from the "just-venting" topic's subrooms and
 * resets memberCount/members for every subroom under that topic.
 *
 * Run:  node tests/clean-just-venting.js [topicKey]
 * Default topicKey is 'just-venting'.
 */
const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const {
  getFirestore, collection, getDocs, writeBatch, doc,
} = require('firebase/firestore');
const fs = require('fs');
const path = require('path');

const TOPIC_KEY = process.argv[2] || 'just-venting';

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

  const app  = initializeApp(config, 'cleanup');
  const auth = getAuth(app);
  const db   = getFirestore(app);

  await signInWithEmailAndPassword(
    auth,
    `${testEnv['TEST_USER1_PHONE']}@ventspace.app`,
    testEnv['TEST_USER1_PASS'],
  );
  console.log(`Signed in. Cleaning topic: ${TOPIC_KEY}`);

  const subroomsRef = collection(db, 'rooms', TOPIC_KEY, 'subrooms');
  const subroomsSnap = await getDocs(subroomsRef);
  if (subroomsSnap.empty) {
    console.log('No subrooms found. Nothing to clean.');
    process.exit(0);
  }

  let totalMsgs = 0;
  for (const subroom of subroomsSnap.docs) {
    const msgsRef = collection(db, 'rooms', TOPIC_KEY, 'subrooms', subroom.id, 'messages');
    const msgsSnap = await getDocs(msgsRef);
    console.log(`  Subroom ${subroom.id}: ${msgsSnap.size} messages, memberCount=${subroom.data().memberCount}`);

    // Delete messages in batches of 450 (Firestore batch limit is 500)
    let batch = writeBatch(db);
    let inBatch = 0;
    for (const m of msgsSnap.docs) {
      batch.delete(doc(db, 'rooms', TOPIC_KEY, 'subrooms', subroom.id, 'messages', m.id));
      inBatch++;
      totalMsgs++;
      if (inBatch >= 450) {
        await batch.commit();
        batch = writeBatch(db);
        inBatch = 0;
      }
    }
    if (inBatch > 0) await batch.commit();

    // Reset counter + members
    await writeBatch(db)
      .update(doc(db, 'rooms', TOPIC_KEY, 'subrooms', subroom.id), {
        memberCount: 0,
        members: {},
      })
      .commit();
  }

  console.log(`\n✅ Deleted ${totalMsgs} messages, reset ${subroomsSnap.size} subroom(s).`);
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
