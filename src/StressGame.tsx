import { useState, useEffect } from 'react';
import { Link } from "react-router-dom";
import { db, auth } from './firebaseConfig';
import { doc, setDoc, onSnapshot, increment, collection, query, orderBy, limit } from 'firebase/firestore';
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, updateProfile, type User } from "firebase/auth";
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
  
  // ニックネーム編集用
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState("");
  
  // エフェクト管理
  const [punchEffects, setPunchEffects] = useState<{id: number, x: number, y: number}[]>([]);
  
  // 画像設定
  const [targetImageUrl] = useState<string>('/assets/target_placeholder.png');
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string>('');
  const [imageUrlInput, setImageUrlInput] = useState('');

  // 武器選択
  const [weapon, setWeapon] = useState<'fist' | 'gun'>('fist');

  // グローバル統計・ランキング
  const [globalDailyClicks, setGlobalDailyClicks] = useState<number>(0);
  const [ranking, setRanking] = useState<{userId: string, displayName: string, score: number}[]>([]);

  // 利用規約
  const [showTerms, setShowTerms] = useState(false);

  // --- 初期化 ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) setNewName(currentUser.displayName || "");
    });
    
    // ローカルストレージから画像読み込み
    const savedImg = localStorage.getItem('uploaded-image-url');
    if (savedImg) setUploadedImageUrl(savedImg);

    return () => unsubscribe();
  }, []);

  // 画像URLの決定
  const displayImage = uploadedImageUrl || targetImageUrl;

  // --- ランキング監視 ---
  useEffect(() => {
    // 日次ランキングなどを想定する場合、collectionを分けることも可能
    // 今回は単純なスコアランキング
    const q = query(collection(db, 'stress_scores'), orderBy('score', 'desc'), limit(10));
    const unsubscribe = onSnapshot(q, (snap) => {
      const ranks = snap.docs.map(doc => ({
        userId: doc.id,
        displayName: doc.data().displayName || 'Unknown',
        score: doc.data().score || 0
      }));
      setRanking(ranks);
    });
    return () => unsubscribe();
  }, []);

  // --- グローバルクリック監視 (今日) ---
  useEffect(() => {
    const today = getTodayDateKey();
    const docRef = doc(db, 'global_stats', today);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setGlobalDailyClicks(docSnap.data().totalClicks || 0);
      } else {
        setGlobalDailyClicks(0);
      }
    });
    return () => unsubscribe();
  }, []);

  // --- スコア保存 (ローカル) ---
  useEffect(() => {
    const data = { score, updatedAt: Date.now() };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  }, [score]);

  // --- アクション ---
  const handleClick = async (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    // 座標取得 (マウス/タッチ対応)
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    // エフェクト追加
    const id = Date.now();
    setPunchEffects(prev => [...prev, { id, x: clientX, y: clientY }]);
    setTimeout(() => {
      setPunchEffects(prev => prev.filter(p => p.id !== id));
    }, 500);

    // 音再生
    if (weapon === 'fist') playPunchSound();
    else playBulletSound();

    // スコア加算
    const points = weapon === 'fist' ? 1 : 5;
    const newScore = score + points;
    setScore(newScore);
    setIsClicking(true);
    setTimeout(() => setIsClicking(false), 100);

    // Firebase更新 (ログイン時)
    if (user) {
      try {
        // 1. 個人のスコア更新
        await setDoc(doc(db, 'stress_scores', user.uid), {
          displayName: user.displayName || 'Anonymous',
          score: newScore,
          updatedAt: Date.now()
        }, { merge: true });

        // 2. グローバル統計更新 (今日)
        const today = getTodayDateKey();
        await setDoc(
          doc(db, 'global_stats', today),
          { totalClicks: increment(points) },
          { merge: true }
        );

      } catch (err) {
        console.error("Firebase update error:", err);
      }
    }
  };

  // ニックネーム変更
  const handleUpdateName = async () => {
    if (!user || !newName.trim()) return;
    try {
      await updateProfile(user, { displayName: newName });
      // DBも即時更新
      await setDoc(doc(db, 'stress_scores', user.uid), {
        displayName: newName
      }, { merge: true });
      
      setUser({ ...user, displayName: newName });
      setIsEditingName(false);
    } catch (error) {
      console.error(error);
      alert("名前の変更に失敗しました");
    }
  };

  // ログイン
  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (error) {
      console.error(error);
    }
  };

  // 画像アップロード
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setUploadedImageUrl(result);
        localStorage.setItem('uploaded-image-url', result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveUrl = () => {
    if (imageUrlInput) {
      setUploadedImageUrl(imageUrlInput);
      localStorage.setItem('uploaded-image-url', imageUrlInput);
      setImageUrlInput('');
    }
  };

  return (
    <div className="stress-relief-container">
      {/* ヘッダー */}
      <div className="header">
        <Link to="/" style={{ textDecoration: 'none', fontSize: '1.2rem', marginRight: 'auto' }}>🏠 Home</Link>
        
        <div className="auth-section" style={{ background: '#fff', padding: '5px 15px', borderRadius: 20 }}>
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {isEditingName ? (
                <>
                  <input 
                    value={newName} 
                    onChange={e => setNewName(e.target.value)}
                    style={{ padding: 4, width: 100 }}
                  />
                  <button onClick={handleUpdateName}>保存</button>
                  <button onClick={() => setIsEditingName(false)}>✕</button>
                </>
              ) : (
                <>
                  <span>👤 {user.displayName}</span>
                  <button onClick={() => setIsEditingName(true)} style={{ padding: '2px 6px', fontSize: '0.8rem' }}>✏️</button>
                </>
              )}
              <button onClick={() => signOut(auth)}>ログアウト</button>
            </div>
          ) : (
            <button onClick={handleLogin}>Googleでログイン</button>
          )}
        </div>
      </div>

      <h1>ストレス発散ゲーム</h1>
      
      <div className="global-stats" style={{ background: '#fff', padding: 10, borderRadius: 10, marginBottom: 20 }}>
        <div>🌍 今日の世界総クリック数: <strong>{globalDailyClicks.toLocaleString()}</strong></div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <button 
          onClick={() => setWeapon('fist')}
          style={{ background: weapon === 'fist' ? '#ffeb3b' : '#eee', border: weapon === 'fist' ? '2px solid orange' : '1px solid #ccc' }}
        >
          パンチ (1pt)
        </button>
        <button 
          onClick={() => setWeapon('gun')}
          style={{ background: weapon === 'gun' ? '#ffeb3b' : '#eee', border: weapon === 'gun' ? '2px solid orange' : '1px solid #ccc' }}
        >
          銃 (5pt)
        </button>
      </div>

      <div className="game-area-container" style={{ position: 'relative', width: '100%', maxWidth: 500, height: 400, margin: '0 auto' }}>
        <div 
          className={`target-image ${isClicking ? 'shake' : ''}`}
          style={{ 
            width: '100%', height: '100%', 
            backgroundImage: `url(${displayImage})`, 
            backgroundSize: 'cover', backgroundPosition: 'center',
            borderRadius: 10, border: '4px solid #333',
            cursor: weapon === 'fist' ? 'url(/assets/fist-cursor.png), pointer' : 'crosshair'
          }}
          onClick={handleClick}
        >
          {/* エフェクト表示 */}
          {punchEffects.map(effect => (
            <div 
              key={effect.id}
              className="punch-effect"
              style={{ 
                position: 'fixed', left: effect.x, top: effect.y,
                fontSize: '3rem', pointerEvents: 'none',
                transform: 'translate(-50%, -50%)',
                animation: 'fade-out 0.5s forwards'
              }}
            >
              {weapon === 'fist' ? '💥' : '💨'}
            </div>
          ))}
        </div>
      </div>

      <div className="score-board" style={{ marginTop: 20, fontSize: '2rem', fontWeight: 'bold', color: '#fff', textShadow: '2px 2px 4px #000' }}>
        SCORE: {score.toLocaleString()}
      </div>

      {/* 設定エリア */}
      <div className="settings-area" style={{ marginTop: 40, background: 'rgba(255,255,255,0.9)', padding: 20, borderRadius: 10, width: '100%', maxWidth: 500 }}>
        <h3>画像設定</h3>
        <p style={{ fontSize: '0.9rem', color: '#666' }}>嫌いなものの画像をアップロードして叩こう！</p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
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
            <h3>Top 10 Ranking</h3>
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
      <div style={{ marginTop: 20 }}>
        <button onClick={() => setShowTerms(true)} style={{ background: 'none', border: 'none', color: '#fff', textDecoration: 'underline' }}>
          利用規約
        </button>
      </div>
    </div>
  );
}