import { useState, useEffect } from 'react';
import { Link } from "react-router-dom";
import { db, auth } from './firebaseConfig';
import { doc, setDoc, onSnapshot, increment, collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, type User } from "firebase/auth";
import { playPunchSound, playBulletSound } from './soundManager';
import TermsOfService from './TermsOfService';
import './App.css'; 

// LocalStorage キーとゲームデータ型
const SAVE_KEY = 'stress-relief-game-save';

// コンポーネント名を App から StressGame に変更
export default function StressGame() {
  // ゲームスコア
  const [score, setScore] = useState<number>(() => {
    try {
      const savedData = localStorage.getItem(SAVE_KEY);
      return savedData ? JSON.parse(savedData).score : 0;
    } catch (error) {
      console.error('Error parsing saved score:', error);
      return 0;
    }
  });

  const [user, setUser] = useState<User | null>(null);
  const [isClicking, setIsClicking] = useState(false);
  const [punchEffects, setPunchEffects] = useState<{id: number, x: number, y: number}[]>([]);
  const [punchIdCounter, setPunchIdCounter] = useState(0);
  const [bulletEffects, setBulletEffects] = useState<{id: number, x: number, y: number}[]>([]);
  const [bulletIdCounter, setBulletIdCounter] = useState(0);
  const [effectMode, setEffectMode] = useState<'punch' | 'bullet'>('punch');
  const [showTerms, setShowTerms] = useState(false);
  const [customImageUrl, setCustomImageUrl] = useState<string>(() => localStorage.getItem('custom-image-url') || '');
  const [imageUrlInput, setImageUrlInput] = useState(customImageUrl);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string>(() => localStorage.getItem('uploaded-image-url') || '');
  const [globalTotalClicks, setGlobalTotalClicks] = useState<number | null>(null);
  const [ranking, setRanking] = useState<any[]>([]);

  // 認証監視
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => setUser(currentUser));
    return () => unsubscribe();
  }, []);

  // スコア保存
  useEffect(() => {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ score, lastSavedAt: Date.now() }));
  }, [score]);

  // 画像クリック処理
  const handleImageClick = async (e: React.MouseEvent<HTMLImageElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (effectMode === 'punch') {
      const id = punchIdCounter;
      setPunchEffects(prev => [...prev, { id, x, y }]);
      setPunchIdCounter(c => c + 1);
      setTimeout(() => setPunchEffects(prev => prev.filter(p => p.id !== id)), 300);
      playPunchSound();
    } else if (effectMode === 'bullet' && user) {
      const id = bulletIdCounter;
      setBulletEffects(prev => [...prev, { id, x, y }]);
      setBulletIdCounter(c => c + 1);
      setTimeout(() => setBulletEffects(prev => prev.filter(b => b.id !== id)), 400);
      playBulletSound();
    }

    setIsClicking(true);
    setScore(s => s + 1);
    setTimeout(() => setIsClicking(false), 200);
  };

  const handleGoogleSignIn = async () => { await signInWithPopup(auth, new GoogleAuthProvider()); };
  const handleSignOut = async () => { await signOut(auth); };

  const displayImageUrl = uploadedImageUrl || customImageUrl || 'https://via.placeholder.com/300?text=%F0%9F%98%A4+ストレス%0A%F0%9F%92%A5';

  return (
    <div className="stress-relief-container">
      <div style={{position: 'absolute', top: 10, left: 10, zIndex: 100}}>
         <Link to="/" style={{color: 'white', fontWeight: 'bold', textDecoration: 'none', background: 'rgba(0,0,0,0.5)', padding: '5px 10px', borderRadius: '5px'}}>← Homeに戻る</Link>
      </div>

      <div className="header">
        <div className="auth-section">
          {user ? (
            <div className="user-info"><p>User: <strong>{user.displayName}</strong></p><button onClick={handleSignOut}>ログアウト</button></div>
          ) : (
            <button onClick={handleGoogleSignIn}>Googleでログイン</button>
          )}
        </div>
      </div>

      <div className="game-area">
        <div className="score-display"><p>Score: {Math.floor(score)}</p></div>
        <div className="punch-container">
          <img src={displayImageUrl} className={`clickable-image ${isClicking ? 'pulse' : ''}`} onClick={handleImageClick} />
          {punchEffects.map(p => <div key={p.id} className="punch-effect" style={{left:p.x, top:p.y}}>👊</div>)}
        </div>
      </div>
      {showTerms && <TermsOfService onClose={() => setShowTerms(false)} />}
    </div>
  );
}