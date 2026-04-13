import { useEffect, useState } from 'react';
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../firebase/config';

export interface Message {
  id: string;
  type: 'text' | 'gif';
  text: string;
  gifUrl?: string;
  senderId: string;
  timestamp: ReturnType<typeof serverTimestamp> | null;
}

export function useChat(sessionId: string | null, uid: string | undefined) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [partnerLeft, setPartnerLeft] = useState(false);
  const [sessionActive, setSessionActive] = useState(true);

  useEffect(() => {
    if (!sessionId) return;

    const messagesRef = collection(db, 'sessions', sessionId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));

    const unsubMessages = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Message)));
    });

    const unsubSession = onSnapshot(doc(db, 'sessions', sessionId), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (!data.active) {
          setSessionActive(false);
          if (data.endedBy && data.endedBy !== uid) {
            setPartnerLeft(true);
          }
        }
      }
    });

    return () => {
      unsubMessages();
      unsubSession();
    };
  }, [sessionId, uid]);

  const sendMessage = async (text: string) => {
    if (!sessionId || !uid || !text.trim()) return;
    await addDoc(collection(db, 'sessions', sessionId, 'messages'), {
      type: 'text',
      text: text.trim(),
      senderId: uid,
      timestamp: serverTimestamp(),
    });
  };

  const sendGif = async (gifUrl: string, title: string) => {
    if (!sessionId || !uid) return;
    await addDoc(collection(db, 'sessions', sessionId, 'messages'), {
      type: 'gif',
      text: title,
      gifUrl,
      senderId: uid,
      timestamp: serverTimestamp(),
    });
  };

  const endSession = async () => {
    if (!sessionId || !uid) return;
    await updateDoc(doc(db, 'sessions', sessionId), {
      active: false,
      endedBy: uid,
    });
  };

  return { messages, partnerLeft, sessionActive, sendMessage, sendGif, endSession };
}
