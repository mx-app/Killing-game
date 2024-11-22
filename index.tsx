import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { auth, db } from '../lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { collection, query, getDocs, addDoc, where } from 'firebase/firestore';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import Link from 'next/link';

export default function Home() {
  const [user] = useAuthState(auth);
  const [clans, setClans] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [newClanName, setNewClanName] = useState('');
  const router = useRouter();

  useEffect(() => {
    if (user) {
      fetchClans();
    }
  }, [user]);

  const fetchClans = async () => {
    const q = query(collection(db, 'clans'));
    const querySnapshot = await getDocs(q);
    setClans(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const filteredClans = clans.filter(clan =>
    clan.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const createClan = async (e) => {
    e.preventDefault();
    if (!newClanName.trim()) return;

    const uniqueLink = Math.random().toString(36).substr(2, 8);
    const newClan = {
      name: newClanName,
      ownerId: user.uid,
      createdAt: new Date(),
      uniqueLink
    };

    try {
      const docRef = await addDoc(collection(db, 'clans'), newClan);
      setNewClanName('');
      fetchClans();
    } catch (error) {
      console.error('Error creating clan:', error);
    }
  };

  const signIn = () => {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider);
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <button onClick={signIn} className="bg-blue-500 text-white p-2 rounded">
          Sign in with Google
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">إدارة العشائر</h1>
      <div className="mb-4">
        <input
          type="text"
          placeholder="ابحث عن عشيرة"
          value={searchTerm}
          onChange={handleSearch}
          className="border p-2 w-full"
        />
      </div>
      <form onSubmit={createClan} className="mb-8">
        <input
          type="text"
          value={newClanName}
          onChange={(e) => setNewClanName(e.target.value)}
          placeholder="اسم العشيرة الجديدة"
          className="border p-2 mr-2"
        />
        <button type="submit" className="bg-green-500 text-white p-2 rounded">
          إنشاء عشيرة
        </button>
      </form>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredClans.map(clan => (
          <Link href={`/clan/${clan.id}`} key={clan.id}>
            <div className="border p-4 rounded cursor-pointer hover:bg-gray-100">
              <h2 className="text-xl font-semibold">{clan.name}</h2>
              <p>الرابط الفريد: {clan.uniqueLink}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

