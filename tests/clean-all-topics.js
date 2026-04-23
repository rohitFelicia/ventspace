/**
 * Wipes ALL category data:
 *   1. Deletes every document in /topics (user-created categories)
 *   2. For every topic key (built-in + any found under /rooms), deletes all
 *      messages and all subroom docs.
 *
 * Built-in topics (Heartbreak, Work Stress, Family, Anxiety, Just Venting)
 * come from src/constants/topics.ts and will reappear automatically in the UI
 * once the app reloads — just with empty rooms.
 *
 * Run: node tests/clean-all-topics.js
 */
const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const {
  getFirestore, collection, collectionGroup, getDocs, writeBatch, doc, deleteDoc,
} = require('firebase/firestore');
const fs = require('fs');
const path = require('path');

const BUILT_IN_KEYS = ['breakup', 'work', 'family', 'anxiety', 'general'];

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

async function batchDelete(db, refs) {
  let batch = writeBatch(db);
  let n = 0, total = 0;
  for (const r of refs) {
    batch.delete(r);
    n++; total++;
    if (n >= 450) { await batch.commit(); batch = writeBatch(db); n = 0; }
  }
  if (n > 0) await batch.commit();
  return total;
}

async function wipeTopic(db, topicKey) {
  const subrooms = await getDocs(collection(db, 'rooms', topicKey, 'subrooms'));
  if (subrooms.empty) return { topic: topicKey, subrooms: 0, messages: 0 };

  let totalMsgs = 0;
  const subroomRefs = [];
  for (const s of subrooms.docs) {
    const msgs = await getDocs(collection(db, 'rooms', topicKey, 'subrooms', s.id, 'messages'));
    const msgRefs = msgs.docs.map(m => doc(db, 'rooms', topicKey, 'subrooms', s.id, 'messages', m.id));
    try {
      totalMsgs += await batchDelete(db, msgRefs);
    } catch (e) {
      console.log(`    !! msg delete failed in ${s.id}: ${e.code || e.message}`);
    }
    subroomRefs.push(doc(db, 'rooms', topicKey, 'subrooms', s.id));
  }
  await batchDelete(db, subroomRefs).catch(e => console.log(`    !! subroom delete failed: ${e.code || e.message}`));
  return { topic: topicKey, subrooms: subrooms.size, messages: totalMsgs };
}

async function main() {
  const testEnv = loadEnv('.env.test');
  const mainEnv = fs.existsSync(path.join(__dirname, '..', '.env'))
    ? loadEnv('.env') : testEnv;

  const app  = initializeApp({
    apiKey:            mainEnv['EXPO_PUBLIC_FIREBASE_API_KEY'],
    authDomain:        mainEnv['EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN'],
    projectId:         mainEnv['EXPO_PUBLIC_FIREBASE_PROJECT_ID'],
    storageBucket:     mainEnv['EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET'],
    messagingSenderId: mainEnv['EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'],
    appId:             mainEnv['EXPO_PUBLIC_FIREBASE_APP_ID'],
  }, 'clean-all');
  const auth = getAuth(app);
  const db   = getFirestore(app);
  await signInWithEmailAndPassword(
    auth,
    `${testEnv['TEST_USER1_PHONE']}@ventspace.app`,
    testEnv['TEST_USER1_PASS'],
  );
  console.log('Signed in.');

  // 1) Find all topic keys = built-in + any discovered custom /topics docs
  const topicsSnap = await getDocs(collection(db, 'topics'));
  const customKeys = topicsSnap.docs.map(d => d.id);
  console.log(`\nCustom /topics docs: ${customKeys.length}`);
  customKeys.forEach(k => console.log('  -', k));

  const allKeys = Array.from(new Set([...BUILT_IN_KEYS, ...customKeys]));
  console.log(`\nWiping rooms/messages for ${allKeys.length} topic keys...`);

  const results = [];
  for (const k of allKeys) {
    const r = await wipeTopic(db, k);
    console.log(`  [${k}] subrooms=${r.subrooms} messages=${r.messages}`);
    results.push(r);
  }

  // 2) Delete all /topics documents
  console.log('\nDeleting /topics docs...');
  for (const t of topicsSnap.docs) {
    try {
      await deleteDoc(doc(db, 'topics', t.id));
      console.log(`  - deleted topic ${t.id} (${t.data().label || '?'})`);
    } catch (e) {
      console.log(`  !! could not delete ${t.id}: ${e.code || e.message}`);
    }
  }

  const totalMsgs = results.reduce((s, r) => s + r.messages, 0);
  const totalSub  = results.reduce((s, r) => s + r.subrooms, 0);
  console.log(`\n✅ Done. Deleted ${totalMsgs} messages, ${totalSub} subrooms, ${topicsSnap.size} custom topic docs.`);
  console.log('Built-in topics will reappear in the UI from src/constants/topics.ts.');
  process.exit(0);
}

main().catch(e => { console.error('ERR', e); process.exit(1); });
