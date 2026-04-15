import { useEffect, useState } from 'react';
import {
  addDoc,
  collection,
  doc,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../firebase/config';

export interface RoomMessage {
  id: string;
  type: 'text' | 'gif';
  text: string;
  gifUrl?: string;
  senderId: string;
  senderAlias: string;
  timestamp: ReturnType<typeof serverTimestamp> | null;
  reactions?: Record<string, number>;
}

export function useRoomChat(
  topicKey: string,
  roomId: string,
  uid: string | undefined,
  alias: string | null,
) {
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [typingAliases, setTypingAliases] = useState<string[]>([]);

  const senderAlias = alias ?? (uid ? `Anon#${uid.slice(-4).toUpperCase()}` : 'Anon');

  useEffect(() => {
    if (!uid || !roomId) return;

    const q = query(
      collection(db, 'rooms', topicKey, 'subrooms', roomId, 'messages'),
      orderBy('timestamp', 'asc'),
      limit(100),
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() } as RoomMessage)));
    });

    const unsubTyping = onSnapshot(
      collection(db, 'rooms', topicKey, 'subrooms', roomId, 'typing'),
      (snap) => {
        const names = snap.docs
          .filter((d) => d.id !== uid && d.data().isTyping === true)
          .map((d) => (d.data().alias as string) || 'Someone');
        setTypingAliases(names);
      },
    );

    return () => {
      unsubscribe();
      unsubTyping();
    };
  }, [topicKey, roomId, uid]);

  const sendMessage = async (text: string) => {
    if (!uid || !roomId || !text.trim()) return;
    await addDoc(collection(db, 'rooms', topicKey, 'subrooms', roomId, 'messages'), {
      type: 'text',
      text: text.trim(),
      senderId: uid,
      senderAlias,
      timestamp: serverTimestamp(),
    });
  };

  const sendGif = async (gifUrl: string, title: string) => {
    if (!uid || !roomId) return;
    await addDoc(collection(db, 'rooms', topicKey, 'subrooms', roomId, 'messages'), {
      type: 'gif',
      text: title,
      gifUrl,
      senderId: uid,
      senderAlias,
      timestamp: serverTimestamp(),
    });
  };

  const setTyping = async (isTyping: boolean) => {
    if (!uid || !roomId) return;
    try {
      await setDoc(
        doc(db, 'rooms', topicKey, 'subrooms', roomId, 'typing', uid),
        { isTyping, alias: senderAlias, ts: serverTimestamp() },
      );
    } catch { /* best-effort */ }
  };

  const addReaction = async (messageId: string, emoji: string) => {
    if (!uid || !roomId) return;
    try {
      await updateDoc(
        doc(db, 'rooms', topicKey, 'subrooms', roomId, 'messages', messageId),
        { [`reactions.${emoji}`]: increment(1) },
      );
    } catch { /* best-effort */ }
  };

  return { messages, senderAlias, typingAliases, sendMessage, sendGif, setTyping, addReaction };
}
