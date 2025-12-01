import { useState, useEffect } from 'react';
import { Link } from "react-router-dom";
import { db, auth } from './firebaseConfig';
import { doc, setDoc, onSnapshot, increment, collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, type User } from "firebase/auth";
import { playPunchSound, playBulletSound } from './soundManager';
import TermsOfService from './TermsOfService';
import './App.css'; 

// LocalStorage キー
const SAVE_KEY = 'stress-relief-game-save';

// 日付キー取得
const getTodayDateKey = (): string => {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function StressGame() {
  // --- ステート定義 ---
  const [score, setScore] = useState<number>(() => {
    try {
      const savedData = localStorage.getItem(SAVE_KEY);
      return savedData ? JSON.parse(savedData).score : 0;
    } catch { return 0; }
  });

  const [user, setUser] = useState<User | null>(null);
  const [isClicking, setIsClicking] = useState(false);
  
  // エフェクト管理
  const [punchEffects, setPunchEffects] = useState<{id: number, x: number, y: number}[]>([]);
  const [punchIdCounter, setPunchIdCounter] = useState(0);
  const [bulletEffects, setBulletEffects] = useState<{id: number, x: number, y: number}[]>([]);
  const [bulletIdCounter, setBulletIdCounter] = useState(0);
  const [effectMode, setEffectMode] = useState<'punch' | 'bullet'>('punch');

  // 設定・データ
  const [showTerms, setShowTerms] = useState(false);
  const [customImageUrl, setCustomImageUrl] = useState<string>(() => localStorage.getItem('custom-image-url') || '');
  const [imageUrlInput, setImageUrlInput] = useState(customImageUrl);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string>(() => localStorage.getItem('uploaded-image-url') || '');
  const [globalTotalClicks, setGlobalTotalClicks] = useState<number | null>(null);
  const [ranking, setRanking] = useState<any[]>([]);

  // --- useEffects ---

  // 1. ユーザー認証監視
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => setUser(currentUser));
    return () => unsubscribe();
  }, []);

  // 2. グローバル統計（dbを使用）
  useEffect(() => {
    try {
      const todayKey = getTodayDateKey();
      const todayStatsDocRef = doc(db, 'global', 'dailyStats', todayKey);
      const unsubscribe = onSnapshot(todayStatsDocRef, (snapshot) => {
        if (snapshot.exists()) setGlobalTotalClicks(snapshot.data().clicks || 0);
        else setGlobalTotalClicks(0);
      });
      return () => unsubscribe();
    } catch (e) { console.error(e); }
  }, []);

  // 3. ランキング取得（db, rankingを使用）
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
    const interval = setInterval(fetchRanking, 10000); // 10秒ごとに更新
    return () => clearInterval(interval);
  }, []);

  // 4. スコア保存
  useEffect(() => {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ score, lastSavedAt: Date.now() }));
  }, [score]);

  // --- ハンドラー関数 ---

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

    // エフェクト分岐
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

  const handleSaveUrl = () => {
    localStorage.setItem('custom-image-url', imageUrlInput);
    setCustomImageUrl(imageUrlInput);
  };

  // 表示画像決定
  const displayImageUrl = uploadedImageUrl || customImageUrl || 'https://via.placeholder.com/300?text=%F0%9F%98%A4+ストレス%0A%F0%9F%92%A5';

  // --- JSX描画（ここで全ての変数を使用します） ---
  return (
    <div className="stress-relief-container">
      {/* 戻るボタン */}
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
        
        {/* グローバル統計を使用 */}
        <div className="global-stats">
          <p>みんなのクリック数: {globalTotalClicks !== null ? globalTotalClicks.toLocaleString() : '...'}</p>
        </div>

        <button className="terms-button" onClick={() => setShowTerms(true)}>規約</button>
      </div>

      <div className="game-area">
        <div className="score-display">
          <p className="score-label">Score</p>
          <p className="score-value">{Math.floor(score)}</p>
        </div>

        {/* エフェクトモード切替を使用 */}
        <div className="effect-selector" style={{ margin: '10px 0' }}>
          <button 
            className={`effect-button ${effectMode==='punch'?'active':''}`} 
            onClick={()=>setEffectMode('punch')} 
            style={{marginRight: 10, padding: '5px 15px', background: effectMode==='punch'?'#f39c12':'#eee'}}
          >
            👊 パンチ
          </button>
          <button 
            className={`effect-button ${effectMode==='bullet'?'active':''}`} 
            disabled={!user} 
            onClick={()=>user && setEffectMode('bullet')}
            style={{padding: '5px 15px', background: effectMode==='bullet'?'#e74c3c':'#eee', opacity: !user ? 0.5 : 1}}
          >
            🔫 銃（要ログイン）
          </button>
        </div>

        <div className={`image-click-area ${isClicking ? 'clicked' : ''}`} style={{position: 'relative', display: 'inline-block'}}>
          <div className="punch-container">
            <img 
              src={displayImageUrl} 
              className={`clickable-image ${isClicking ? 'pulse' : ''}`} 
              onClick={handleImageClick}
              style={{ maxWidth: '100%', maxHeight: '400px', cursor: 'pointer' }}
              alt="target"
            />
            {/* パンチエフェクト描画 */}
            {punchEffects.map(p => (
              <div key={p.id} className="punch-effect" style={{position: 'absolute', left:p.x, top:p.y, fontSize: '2rem', pointerEvents: 'none'}}>👊</div>
            ))}
            {/* 銃エフェクト描画（bulletEffectsを使用） */}
            {user && bulletEffects.map(b => (
              <div key={b.id} className="bullet-effect" style={{position: 'absolute', left:b.x, top:b.y, fontSize: '2rem', pointerEvents: 'none'}}>🕳️</div>
            ))}
          </div>
        </div>

        {/* 設定エリア（imageUrlInput, setImageUrlInput, setUploadedImageUrlを使用） */}
        <div className="image-config-section" style={{ marginTop: 20, padding: 20, background: '#f9f9f9', borderRadius: 10 }}>
          <h3>画像設定</h3>
          <div style={{marginBottom: 10}}>
            <input 
              type="text" 
              placeholder="画像URLを入力..." 
              value={imageUrlInput} 
              onChange={e=>setImageUrlInput(e.target.value)} 
              style={{padding: 5, width: '60%'}}
            />
            <button onClick={handleSaveUrl} style={{marginLeft: 5}}>URL保存</button>
          </div>
          <div>
            <input type="file" accept="image/*" onChange={handleImageUpload} />
            {uploadedImageUrl && (
              <button onClick={()=>{setUploadedImageUrl(''); localStorage.removeItem('uploaded-image-url')}} style={{marginLeft: 5, color: 'red'}}>
                リセット
              </button>
            )}
          </div>
        </div>

        {/* ランキング表示（ranking変数を使用） */}
        {user && ranking.length > 0 && (
          <div className="ranking-section" style={{marginTop: 20, textAlign: 'left', maxWidth: 400, margin: '20px auto'}}>
            <h3>🏆 Top 10 Ranking</h3>
            <ul style={{listStyle: 'none', padding: 0}}>
              {ranking.map((r, i) => (
                <li key={r.userId} style={{padding: '5px 0', borderBottom: '1px solid #eee', color: r.userId===user.uid ? 'blue' : 'black'}}>
                  <strong>{i+1}.</strong> {r.displayName} : {r.score}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {showTerms && <TermsOfService onClose={() => setShowTerms(false)} />}
    </div>
  );
}