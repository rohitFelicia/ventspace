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
  where,
} from 'firebase/firestore';
import { db } from '../firebase/config';

const MAX_ROOM_SIZE = 10;

/**
 * Auto-join logic for group rooms.
 *
 * Data model:
 *   rooms/{topicKey}/subrooms/{roomId}
 *     — { topic, createdAt, memberCount, members: { [uid]: true } }
 *   rooms/{topicKey}/subrooms/{roomId}/messages/{msgId}
 *
 * Flow:
 *  1. Query subrooms for the topic with memberCount < MAX_ROOM_SIZE.
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

      // Find an available room (has space) — no orderBy to avoid composite index requirement
      const availableQuery = query(
        subroomsRef,
        where('memberCount', '<', MAX_ROOM_SIZE),
        limit(1),
      );

      const snap = await getDocs(availableQuery);
      let targetRoomId: string;

      if (!snap.empty) {
        // Join existing room via transaction
        const existingRef = snap.docs[0].ref;
        targetRoomId = existingRef.id;

        await runTransaction(db, async (tx) => {
          const roomSnap = await tx.get(existingRef);
          if (!roomSnap.exists()) throw new Error('Room disappeared');
          const current = roomSnap.data().memberCount as number;
          if (current >= MAX_ROOM_SIZE) throw new Error('Room full');
          tx.update(existingRef, {
            memberCount: current + 1,
            [`members.${uid}`]: true,
          });
        });
      } else {
        // Create a new subroom
        const newRoomRef = doc(subroomsRef);
        targetRoomId = newRoomRef.id;

        await runTransaction(db, async (tx) => {
          tx.set(newRoomRef, {
            topic: topicKey,
            createdAt: serverTimestamp(),
            memberCount: 1,
            members: { [uid]: true },
          });
        });
      }

      // Write system join message
      try {
        await addDoc(
          collection(db, 'rooms', topicKey, 'subrooms', targetRoomId, 'messages'),
          {
            type: 'system',
            text: `${alias ?? 'Someone'} joined the chat`,
            senderId: 'system',
            timestamp: serverTimestamp(),
          },
        );
      } catch { /* non-blocking */ }

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
            senderId: 'system',
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
