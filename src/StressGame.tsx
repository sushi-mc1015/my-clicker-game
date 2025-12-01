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

interface GameData {
  score: number;
  lastSavedAt: number;
}

// 今日の日付キー
const getTodayDateKey = (): string => {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// ランキングエントリの型
interface RankingEntry {
  userId: string;
  displayName: string;
  score: number;
  photoURL?: string;
}

// ストレス発散ゲームコンポーネント
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
  const [ranking, setRanking] = useState<RankingEntry[]>([]);

  // 認証監視
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => setUser(currentUser));
    return () => unsubscribe();
  }, []);

  // グローバル統計監視
  useEffect(() => {
    try {
      const todayKey = getTodayDateKey();
      const todayStatsDocRef = doc(db, 'global', 'dailyStats', todayKey);
      const unsubscribe = onSnapshot(todayStatsDocRef, (snapshot) => {
        if (snapshot.exists()) setGlobalTotalClicks(snapshot.data().clicks || 0);
        else setGlobalTotalClicks(0);
      });
      return () => unsubscribe();
    } catch (error) { console.error(error); }
  }, []);

  // ランキング取得
  useEffect(() => {
    const fetchRanking = async () => {
      try {
        const q = query(collection(db, 'users'), orderBy('score', 'desc'), limit(10));
        const snapshot = await getDocs(q);
        setRanking(snapshot.docs.map(d => ({
          userId: d.id,
          displayName: d.data().displayName || 'Anonymous',
          score: d.data().score || 0,
          photoURL: d.data().photoURL,
        })));
      } catch (e) { console.error(e); }
    };
    fetchRanking();
    const interval = setInterval(fetchRanking, 5000);
    return () => clearInterval(interval);
  }, []);

  // スコア保存
  useEffect(() => {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ score, lastSavedAt: Date.now() }));
  }, [score]);

  // アクション
  const handleGoogleSignIn = async () => {
    try { await signInWithPopup(auth, new GoogleAuthProvider()); } catch (e) { console.error(e); }
  };
  
  const handleSignOut = async () => {
    try { await signOut(auth); } catch (e) { console.error(e); }
  };

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

    // Firestore更新
    try {
      const todayKey = getTodayDateKey();
      setDoc(doc(db, 'global', 'dailyStats', todayKey), { clicks: increment(1) }, { merge: true });
      if (user) {
        setDoc(doc(db, 'users', user.uid), {
          displayName: user.displayName || 'Anonymous',
          photoURL: user.photoURL || null,
          score: score + 1,
          lastUpdated: new Date(),
        }, { merge: true });
      }
    } catch (e) { console.error(e); }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || file.size > 5*1024*1024) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const res = ev.target?.result as string;
      setUploadedImageUrl(res);
      localStorage.setItem('uploaded-image-url', res);
    };
    reader.readAsDataURL(file);
  };

  const displayImageUrl = uploadedImageUrl || customImageUrl || 'https://via.placeholder.com/300?text=%F0%9F%98%A4+ストレス%0A%F0%9F%92%A5';

  return (
    <div className="stress-relief-container">
      <div style={{position: 'absolute', top: 10, left: 10, zIndex: 100}}>
         <Link to="/" style={{color: 'white', fontWeight: 'bold', textDecoration: 'none', background: 'rgba(0,0,0,0.5)', padding: '5px 10px', borderRadius: '5px'}}>← Homeに戻る</Link>
      </div>

      <div className="header">
        <div className="auth-section">
          {user ? (
            <div className="user-info">
              <p>User: <strong>{user.displayName}</strong></p>
              <button className="auth-button logout" onClick={handleSignOut}>ログアウト</button>
            </div>
          ) : (
            <button className="auth-button" onClick={handleGoogleSignIn}>Googleでログイン</button>
          )}
        </div>
        <div className="global-stats">
          <p>今日: {globalTotalClicks ?? '...'} clicks</p>
        </div>
        <button className="terms-button" onClick={() => setShowTerms(true)}>規約</button>
      </div>

      <div className="game-area">
        <div className="score-display">
          <p className="score-label">Score</p>
          <p className="score-value">{Math.floor(score)}</p>
        </div>

        <div className="effect-selector">
          <button className={`effect-button punch ${effectMode==='punch'?'active':''}`} onClick={()=>setEffectMode('punch')}>👊</button>
          <button className={`effect-button bullet ${effectMode==='bullet'?'active':''}`} disabled={!user} onClick={()=>user && setEffectMode('bullet')}>🔫</button>
        </div>

        <div className={`image-click-area ${isClicking ? 'clicked' : ''}`}>
          <div className="punch-container">
            <img src={displayImageUrl} className={`clickable-image ${isClicking ? 'pulse' : ''}`} onClick={handleImageClick} />
            {punchEffects.map(p => <div key={p.id} className="punch-effect" style={{left:p.x, top:p.y}}>👊</div>)}
            {user && bulletEffects.map(b => <div key={b.id} className="bullet-effect" style={{left:b.x, top:b.y}}>🕳️</div>)}
          </div>
        </div>

        <div className="image-config-section">
          <input type="text" placeholder="画像URL..." value={imageUrlInput} onChange={e=>setImageUrlInput(e.target.value)} />
          <button onClick={()=>{localStorage.setItem('custom-image-url', imageUrlInput); setCustomImageUrl(imageUrlInput)}}>保存</button>
          <input type="file" accept="image/*" onChange={handleImageUpload} />
          {uploadedImageUrl && <button onClick={()=>{setUploadedImageUrl(''); localStorage.removeItem('uploaded-image-url')}}>リセット</button>}
        </div>

        {user && ranking.length > 0 && (
          <div className="ranking-section">
            <h3>Top 10</h3>
            {ranking.map((r, i) => (
              <div key={r.userId} className={`ranking-item ${r.userId===user.uid?'current':''}`}>
                {i+1}. {r.displayName} : {r.score}
              </div>
            ))}
          </div>
        )}
      </div>
      {showTerms && <TermsOfService onClose={() => setShowTerms(false)} />}
    </div>
  );
}