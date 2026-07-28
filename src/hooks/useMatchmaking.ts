import { useEffect, useRef, useState } from 'react';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { cosineSimilarity } from '../utils/keywords';

export type MatchmakingStatus = 'idle' | 'waiting' | 'matched' | 'error';

/**
 * Similarity-based matchmaking via Firestore.
 *
 * Data model:
 *   matchmaking_queue/{topicKey}/slots/{uid}  — { uid, keywords, joinedAt }
 *   user_profiles/{uid}/topic_scores/{topicKey} — { keywords: Record<string,number> }
 *   user_pending_sessions/{uid}               — { sessionId }
 *   sessions/{sessionId}                      — { participants, topic, createdAt, active }
 *
 * Flow:
 *  1. Load my keyword profile for this topic from user_profiles.
 *  2. Read all slots in matchmaking_queue/{topicKey}/slots.
 *  3. Score each waiter using cosine similarity; pick best match
 *     (fall back to oldest waiter if no keyword profiles exist yet).
 *  4. Transactionally claim that slot: create session, notify them, delete slot.
 *  5. If no waiters, write my own slot and listen for user_pending_sessions.
 */
export function useMatchmaking(uid: string | undefined, topicKey: string) {
  const [status, setStatus] = useState<MatchmakingStatus>('idle');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const listenerRef = useRef<(() => void) | null>(null);

  const startMatching = async () => {
    if (!uid) return;
    setStatus('waiting');

    const myPendingRef = doc(db, 'user_pending_sessions', uid);
    const mySlotRef = doc(db, 'matchmaking_queue', topicKey, 'slots', uid);

    try {
      // 1. Load my keyword profile (best-effort — empty if none yet)
      let myKeywords: Record<string, number> = {};
      try {
        const profileSnap = await getDoc(doc(db, 'user_profiles', uid, 'topic_scores', topicKey));
        if (profileSnap.exists()) {
          myKeywords = profileSnap.data().keywords ?? {};
        }
      } catch { /* no profile yet, scoring will fall back to join time */ }

      // 2. Read all waiting slots
      const slotsSnap = await getDocs(collection(db, 'matchmaking_queue', topicKey, 'slots'));
      const waiters = slotsSnap.docs
        .filter((d) => d.id !== uid)
        .map((d) => ({
          uid: d.id,
          keywords: (d.data().keywords ?? {}) as Record<string, number>,
          joinedAt: (d.data().joinedAt?.toMillis?.() ?? 0) as number,
        }));

      let matchedSessionId: string | null = null;

      if (waiters.length > 0) {
        // 3. Pick best match by cosine similarity; tie-break by oldest joinedAt
        const hasMyProfile = Object.keys(myKeywords).length > 0;
        let bestUid = waiters[0].uid;
        let bestScore = -1;

        if (hasMyProfile) {
          for (const w of waiters) {
            const score = Object.keys(w.keywords).length > 0
              ? cosineSimilarity(myKeywords, w.keywords)
              : 0;
            if (score > bestScore || (score === bestScore && w.joinedAt < waiters.find(x => x.uid === bestUid)!.joinedAt)) {
              bestScore = score;
              bestUid = w.uid;
            }
          }
        } else {
          // No profiles — pick oldest waiter
          bestUid = waiters.reduce((a, b) => (a.joinedAt < b.joinedAt ? a : b)).uid;
        }

        // 4. Transactionally claim the best slot
        const targetSlotRef = doc(db, 'matchmaking_queue', topicKey, 'slots', bestUid);
        const targetPendingRef = doc(db, 'user_pending_sessions', bestUid);

        await runTransaction(db, async (transaction) => {
          matchedSessionId = null;
          const slotSnap = await transaction.get(targetSlotRef);
          if (!slotSnap.exists()) {
            // Slot was claimed by someone else — fall through to join queue
            return;
          }
          const sessionRef = doc(collection(db, 'sessions'));
          matchedSessionId = sessionRef.id;
          transaction.set(sessionRef, {
            participants: [bestUid, uid],
            topic: topicKey,
            createdAt: serverTimestamp(),
            active: true,
          });
          transaction.set(targetPendingRef, { sessionId: matchedSessionId });
          transaction.delete(targetSlotRef);
        });
      }

      if (matchedSessionId) {
        setSessionId(matchedSessionId);
        setStatus('matched');
      } else {
        // 5. No match found (or slot was sniped) — join queue and listen
        await setDoc(mySlotRef, {
          uid,
          keywords: myKeywords,
          joinedAt: serverTimestamp(),
        });

        listenerRef.current = onSnapshot(myPendingRef, (snap) => {
          if (snap.exists()) {
            const sid = snap.data().sessionId as string;
            setSessionId(sid);
            setStatus('matched');
            listenerRef.current?.();
            listenerRef.current = null;
            deleteDoc(myPendingRef).catch(console.error);
            deleteDoc(mySlotRef).catch(console.error);
          }
        });
      }
    } catch (err) {
      console.error('Matchmaking error:', err);
      setStatus('error');
    }
  };

  const cancelMatching = async () => {
    if (!uid) return;
    listenerRef.current?.();
    listenerRef.current = null;

    try {
      await deleteDoc(doc(db, 'matchmaking_queue', topicKey, 'slots', uid));
    } catch {
      // Ignore — slot may not exist
    }

    setStatus('idle');
    setSessionId(null);
  };

  // Detach listener on unmount
  useEffect(() => {
    return () => {
      listenerRef.current?.();
    };
  }, []);

  return { status, sessionId, startMatching, cancelMatching };
}
