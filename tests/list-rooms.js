const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, collection, getDocs } = require('firebase/firestore');
const fs = require('fs');
const path = require('path');

function loadEnv(file) {
  const envPath = path.join(__dirname, '..', file);
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
  const env = loadEnv('.env.test');
  const envMain = fs.existsSync(path.join(__dirname, '..', '.env'))
    ? loadEnv('.env') : env;
  const app = initializeApp({
    apiKey: envMain.EXPO_PUBLIC_FIREBASE_API_KEY,
    authDomain: envMain.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: envMain.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    appId: envMain.EXPO_PUBLIC_FIREBASE_APP_ID,
  }, 'list');
  const auth = getAuth(app);
  const db = getFirestore(app);
  await signInWithEmailAndPassword(auth, env.TEST_USER1_PHONE + '@ventspace.app', env.TEST_USER1_PASS);

  console.log('=== topics collection ===');
  const topics = await getDocs(collection(db, 'topics'));
  topics.docs.forEach(d => console.log(' -', d.id, '| label=', d.data().label));

  // Known hardcoded topic keys from the app
  const known = ['just-venting', 'anxiety', 'relationships', 'work-stress',
    'family', 'loneliness', 'breakup', 'grief', 'career', 'self-worth',
    'JustVenting', 'just_venting'];
  console.log('\n=== rooms/<key>/subrooms existence check ===');
  for (const k of known) {
    try {
      const sub = await getDocs(collection(db, 'rooms', k, 'subrooms'));
      if (!sub.empty) {
        console.log(` + rooms/${k}/subrooms: ${sub.size} subroom(s)`);
        sub.docs.forEach(d => {
          const data = d.data();
          console.log(`     - ${d.id} memberCount=${data.memberCount} topic=${data.topic}`);
        });
      }
    } catch (e) { /* skip */ }
  }
  process.exit(0);
}
main().catch(e => { console.error('ERR', e.message); process.exit(1); });
