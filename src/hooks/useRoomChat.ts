import { useEffect, useState } from 'react';
import {
  addDoc,
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
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
}

export function useRoomChat(
  topicKey: string,
  roomId: string,
  uid: string | undefined,
  alias: string | null,
) {
  const [messages, setMessages] = useState<RoomMessage[]>([]);

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

    return unsubscribe;
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

  return { messages, senderAlias, sendMessage, sendGif };
}
