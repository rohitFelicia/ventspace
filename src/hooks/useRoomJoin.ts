import { useState } from 'react';
import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  query,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase/config';

/**
 * Auto-join logic for group rooms. No limit on room size — everyone joins the
 * same single subroom per topic.
 *
 * Data model:
 *   rooms/{topicKey}/subrooms/{roomId}
 *     — { topic, createdAt, memberCount, members: { [uid]: true } }
 *   rooms/{topicKey}/subrooms/{roomId}/messages/{msgId}
 *
 * Flow:
 *  1. Query subrooms for the topic (limit 1).
 *  2. If one exists → transaction to increment memberCount + add uid to members.
 *  3. If none → create a new subroom with memberCount: 1.
 *  4. On leave → transaction to decrement + remove uid.
 */
export function useRoomJoin() {
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const joinRoom = async (
    uid: string,
    topicKey: string,
    alias?: string,
  ): Promise<{ roomId: string } | null> => {
    setJoining(true);
    setError(null);

    try {
      const subroomsRef = collection(db, 'rooms', topicKey, 'subrooms');

      // Pick the first existing subroom — no where clause, no index needed
      const snap = await getDocs(query(subroomsRef, limit(1)));
      let targetRoomId: string;
      let targetRef: ReturnType<typeof doc>;
      let isNew: boolean;

      if (!snap.empty) {
        targetRef = snap.docs[0].ref;
        targetRoomId = targetRef.id;
        isNew = false;
      } else {
        targetRef = doc(subroomsRef);
        targetRoomId = targetRef.id;
        isNew = true;
      }

      // Fire-and-forget the expensive writes — navigate immediately with roomId
      const writeOp = isNew
        ? runTransaction(db, async (tx) => {
            tx.set(targetRef, {
              topic: topicKey,
              createdAt: serverTimestamp(),
              memberCount: 1,
              members: { [uid]: true },
            });
          })
        : runTransaction(db, async (tx) => {
            const roomSnap = await tx.get(targetRef);
            if (!roomSnap.exists()) throw new Error('Room disappeared');
            const current = (roomSnap.data().memberCount as number) ?? 0;
            tx.update(targetRef, {
              memberCount: current + 1,
              [`members.${uid}`]: true,
            });
          });

      writeOp
        .then(() =>
          addDoc(
            collection(db, 'rooms', topicKey, 'subrooms', targetRoomId, 'messages'),
            {
              type: 'system',
              text: `${alias ?? 'Someone'} joined the chat`,
              senderId: uid,
              timestamp: serverTimestamp(),
            },
          ).catch(() => {}),
        )
        .catch((err) => console.error('Background join error:', err));

      return { roomId: targetRoomId };
    } catch (err: any) {
      console.error('Room join error:', err);
      setError(err.message ?? 'Failed to join room');
      return null;
    } finally {
      setJoining(false);
    }
  };

  const leaveRoom = async (uid: string, topicKey: string, roomId: string, alias?: string) => {
    try {
      // Write system leave message first (before decrement)
      try {
        await addDoc(
          collection(db, 'rooms', topicKey, 'subrooms', roomId, 'messages'),
          {
            type: 'system',
            text: `${alias ?? 'Someone'} left the chat`,
            senderId: uid,
            timestamp: serverTimestamp(),
          },
        );
      } catch { /* non-blocking */ }
      const roomRef = doc(db, 'rooms', topicKey, 'subrooms', roomId);
      await runTransaction(db, async (tx) => {
        const snap = await tx.get(roomRef);
        if (!snap.exists()) return;
        const current = snap.data().memberCount as number;
        tx.update(roomRef, {
          memberCount: Math.max(0, current - 1),
          [`members.${uid}`]: false,
        });
      });
    } catch (err) {
      console.error('Room leave error:', err);
    }
  };

  return { joining, error, joinRoom, leaveRoom };
}
