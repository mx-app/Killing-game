import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { auth, db } from '../../lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { doc, getDoc, collection, addDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import Link from 'next/link';

export default function ClanPage() {
  const [user] = useAuthState(auth);
  const router = useRouter();
  const { id } = router.query;
  const [clan, setClan] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');

  useEffect(() => {
    if (id && user) {
      fetchClan();
      const unsubscribe = subscribeToMessages();
      return () => unsubscribe();
    }
  }, [id, user]);

  const fetchClan = async () => {
    if (typeof id !== 'string') return;
    const clanDoc = await getDoc(doc(db, 'clans', id));
    if (clanDoc.exists()) {
      setClan({ id: clanDoc.id, ...clanDoc.data() });
    } else {
      router.push('/');
    }
  };

  const subscribeToMessages = () => {
    if (typeof id !== 'string') return () => {};
    const messagesRef = collection(db, 'clans', id, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'));
    return onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    try {
      await addDoc(collection(db, 'clans', id as string, 'messages'), {
        text: newMessage,
        createdAt: new Date(),
        userId: user.uid,
        userName: user.displayName
      });
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  if (!user) {
    return <div className="text-center mt-10">يرجى تسجيل الدخول لعرض هذه العشيرة.</div>;
  }

  if (!clan) {
    return <div className="text-center mt-10">جاري التحميل...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <Link href="/">
        <a className="text-blue-500 mb-4 block">&larr; العودة إلى القائمة الرئيسية</a>
      </Link>
      <h1 className="text-3xl font-bold mb-6">{clan.name}</h1>
      <p className="mb-4">الرابط الفريد: {clan.uniqueLink}</p>
      <div className="border p-4 h-96 overflow-y-auto mb-4">
        {messages.map(message => (
          <div key={message.id} className={`mb-2 ${message.userId === user.uid ? 'text-right' : ''}`}>
            <span className="font-bold">{message.userName}: </span>
            <span>{message.text}</span>
          </div>
        ))}
      </div>
      <form onSubmit={sendMessage} className="flex">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="اكتب رسالة"
          className="border p-2 flex-grow mr-2"
        />
        <button type="submit" className="bg-blue-500 text-white p-2 rounded">إرسال</button>
      </form>
    </div>
  );
}

