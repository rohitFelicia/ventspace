import { useEffect, useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
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
  reactions?: Record<string, number>;
}

export function useChat(sessionId: string | null, uid: string | undefined) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [partnerLeft, setPartnerLeft] = useState(false);
  const [sessionActive, setSessionActive] = useState(true);
  const [partnerTyping, setPartnerTyping] = useState(false);

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

    const unsubTyping = onSnapshot(
      collection(db, 'sessions', sessionId, 'typing'),
      (snap) => {
        const otherTyping = snap.docs.some(
          (d) => d.id !== uid && d.data().isTyping === true,
        );
        setPartnerTyping(otherTyping);
      },
    );

    return () => {
      unsubMessages();
      unsubSession();
      unsubTyping();
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

  const setTyping = async (isTyping: boolean) => {
    if (!sessionId || !uid) return;
    try {
      await setDoc(doc(db, 'sessions', sessionId, 'typing', uid), {
        isTyping,
        ts: serverTimestamp(),
      });
    } catch { /* best-effort */ }
  };

  const addReaction = async (messageId: string, emoji: string) => {
    if (!sessionId) return;
    try {
      await updateDoc(doc(db, 'sessions', sessionId, 'messages', messageId), {
        [`reactions.${emoji}`]: increment(1),
      });
    } catch { /* best-effort */ }
  };

  // Delete all messages in this session — called when EITHER side ends the chat.
  // 1-on-1 messages are not persisted per privacy policy.
  const deleteSessionMessages = async () => {
    if (!sessionId) return;
    try {
      const snap = await getDocs(collection(db, 'sessions', sessionId, 'messages'));
      await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
    } catch {
      // Best-effort — ignore errors (e.g. rules block after session closed)
    }
  };

  return {
    messages,
    partnerLeft,
    sessionActive,
    partnerTyping,
    sendMessage,
    sendGif,
    endSession,
    setTyping,
    addReaction,
    deleteSessionMessages,
  };
}
