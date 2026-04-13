import { useEffect, useRef, useState } from 'react';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase/config';

export type MatchmakingStatus = 'idle' | 'waiting' | 'matched' | 'error';

/**
 * Matchmaking via Firestore transactions.
 *
 * Data model:
 *   matchmaking/{topicKey}          — { waitingUid: string | null }
 *   user_pending_sessions/{userId}  — { sessionId: string }
 *   sessions/{sessionId}            — { participants, topic, createdAt, active }
 *
 * Flow:
 *  1. Read the queue for the topic.
 *  2. If someone is already waiting → create a session, notify them via
 *     user_pending_sessions, clear the queue.
 *  3. If no one is waiting → write my UID to the queue and listen for a session
 *     to appear in my user_pending_sessions doc.
 */
export function useMatchmaking(uid: string | undefined, topicKey: string) {
  const [status, setStatus] = useState<MatchmakingStatus>('idle');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const listenerRef = useRef<(() => void) | null>(null);

  const startMatching = async () => {
    if (!uid) return;
    setStatus('waiting');

    const queueRef = doc(db, 'matchmaking', topicKey);
    const myPendingRef = doc(db, 'user_pending_sessions', uid);
    let matchedSessionId: string | null = null;

    try {
      await runTransaction(db, async (transaction) => {
        // Reset on each retry so stale IDs are never used
        matchedSessionId = null;

        const queueSnap = await transaction.get(queueRef);
        const waitingUid = queueSnap.exists()
          ? (queueSnap.data().waitingUid as string | null)
          : null;

        if (waitingUid && waitingUid !== uid) {
          // Someone is already waiting — pair up
          const sessionRef = doc(collection(db, 'sessions'));
          matchedSessionId = sessionRef.id;

          transaction.set(sessionRef, {
            participants: [waitingUid, uid],
            topic: topicKey,
            createdAt: serverTimestamp(),
            active: true,
          });
          // Notify the waiting person
          transaction.set(doc(db, 'user_pending_sessions', waitingUid), {
            sessionId: matchedSessionId,
          });
          // Clear queue
          transaction.set(queueRef, { waitingUid: null });
        } else if (!waitingUid) {
          // Queue is empty — I'll wait
          transaction.set(queueRef, { waitingUid: uid });
        }
        // If waitingUid === uid, queue already has me; just re-attach listener below
      });

      if (matchedSessionId) {
        // I was the one who created the session — set state directly
        setSessionId(matchedSessionId);
        setStatus('matched');
      } else {
        // I'm waiting — listen for someone to pair me
        listenerRef.current = onSnapshot(myPendingRef, (snap) => {
          if (snap.exists()) {
            const sid = snap.data().sessionId as string;
            setSessionId(sid);
            setStatus('matched');
            listenerRef.current?.();
            listenerRef.current = null;
            deleteDoc(myPendingRef).catch(console.error);
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
      const queueRef = doc(db, 'matchmaking', topicKey);
      await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(queueRef);
        if (snap.exists() && snap.data().waitingUid === uid) {
          transaction.set(queueRef, { waitingUid: null });
        }
      });
    } catch {
      // Ignore errors on cancel — the queue doc will be overwritten on next match
    }

    setStatus('idle');
    setSessionId(null);
  };

  // Detach listener when hook unmounts
  useEffect(() => {
    return () => {
      listenerRef.current?.();
    };
  }, []);

  return { status, sessionId, startMatching, cancelMatching };
}
