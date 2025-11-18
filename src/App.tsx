import { useState, useEffect } from 'react';
import './App.css';

// Firebase 関連のインポート
import { db, auth } from './firebaseConfig';
import { doc, setDoc, onSnapshot, increment } from 'firebase/firestore';
import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged
} from "firebase/auth";
import type { User } from "firebase/auth";

// LocalStorage キーとゲームデータ型
const SAVE_KEY = 'stress-relief-game-save';

interface GameData {
  score: number;
  lastSavedAt: number;
}

// グローバル統計ドキュメントの参照
const globalStatsDocRef = doc(db, 'global', 'stats');


function App() {
  // ゲームスコア
  const [score, setScore] = useState<number>(() => {
    const savedData = localStorage.getItem(SAVE_KEY);
    return savedData ? JSON.parse(savedData).score : 0;
  });

  // 認証ユーザー
  const [user, setUser] = useState<User | null>(null);

  // クリック時のアニメーション用
  const [isClicking, setIsClicking] = useState(false);

  // パンチエフェクト表示用（複数同時表示対応）
  interface PunchEffect {
    id: number;
    x: number;
    y: number;
  }
  const [punchEffects, setPunchEffects] = useState<PunchEffect[]>([]);
  const [punchIdCounter, setPunchIdCounter] = useState(0);

  // ユーザーが入力した画像 URL
  const [customImageUrl, setCustomImageUrl] = useState<string>(() => {
    const saved = localStorage.getItem('custom-image-url');
    return saved || '';
  });

  // 画像 URL 入力フォーム用の一時状態
  const [imageUrlInput, setImageUrlInput] = useState(customImageUrl);

  // ファイルアップロード機能
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string>(() => {
    const saved = localStorage.getItem('uploaded-image-url');
    return saved || '';
  });

  // グローバル統計
  const [globalTotalClicks, setGlobalTotalClicks] = useState<number | null>(null);

  // 認証状態の監視
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // グローバル統計の監視
  useEffect(() => {
    const unsubscribe = onSnapshot(globalStatsDocRef, (doc) => {
      if (doc.exists()) {
        setGlobalTotalClicks(doc.data().totalClicks);
      } else {
        setGlobalTotalClicks(0);
      }
    });
    return () => unsubscribe();
  }, []);

  // ローカル保存
  useEffect(() => {
    const gameData: GameData = {
      score: score,
      lastSavedAt: Date.now(),
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(gameData));
  }, [score]);

  // Google ログイン
  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Google ログインエラー: ", error);
    }
  };

  // ログアウト
  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("ログアウトエラー: ", error);
    }
  };

  // 画像をクリック
  const handleImageClick = async (e: React.MouseEvent<HTMLImageElement>) => {
    // マウス位置を取得
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // パンチエフェクトを追加
    const newId = punchIdCounter;
    setPunchEffects([...punchEffects, { id: newId, x, y }]);
    setPunchIdCounter(punchIdCounter + 1);

    // 300ms後にパンチを削除
    setTimeout(() => {
      setPunchEffects((prev) => prev.filter((p) => p.id !== newId));
    }, 300);

    setIsClicking(true);
    setScore(score + 1);

    // Firebase に記録
    try {
      await setDoc(globalStatsDocRef, { 
        totalClicks: increment(1) 
      }, { merge: true });
    } catch (error) {
      console.error("Error updating global stats: ", error);
    }

    // アニメーション終了
    setTimeout(() => setIsClicking(false), 200);
  };

  // 画像 URL を保存する
  const handleSaveImageUrl = () => {
    localStorage.setItem('custom-image-url', imageUrlInput);
    setCustomImageUrl(imageUrlInput);
  };

  // 画像 URL をリセット
  const handleResetImageUrl = () => {
    setImageUrlInput('');
    setCustomImageUrl('');
    localStorage.removeItem('custom-image-url');
  };

  // ファイルアップロード処理
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // ファイルサイズチェック（5MB以下）
    if (file.size > 5 * 1024 * 1024) {
      alert('ファイルサイズは5MB以下にしてください');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setUploadedImageUrl(dataUrl);
      localStorage.setItem('uploaded-image-url', dataUrl);
    };
    reader.readAsDataURL(file);
  };

  // アップロード画像をリセット
  const handleResetUploadedImage = () => {
    setUploadedImageUrl('');
    localStorage.removeItem('uploaded-image-url');
  };

  // 表示する画像 URL（優先順位：アップロード画像 > URL入力 > デフォルト）
  const displayImageUrl = uploadedImageUrl || customImageUrl || 'https://via.placeholder.com/300?text=%F0%9F%98%A4+ストレス%0A%F0%9F%92%A5';


  // UI を返す
  return (
    <div className="stress-relief-container">
      {/* ヘッダー：認証情報 */}
      <div className="header">
        <div className="auth-section">
          {user ? (
            <div className="user-info">
              <p>ようこそ、<strong>{user.displayName}</strong> さん</p>
              <button className="auth-button logout" onClick={handleSignOut}>
                ログアウト
              </button>
            </div>
          ) : (
            <div className="user-info">
              <p>ログインして、ランキングに参加しよう！</p>
              <button className="auth-button" onClick={handleGoogleSignIn}>
                Googleでログイン
              </button>
            </div>
          )}
        </div>

        {/* グローバル統計 */}
        <div className="global-stats">
          <p className="stat-label">全体クリック数</p>
          <p className="stat-value">
            {globalTotalClicks === null ? '...' : Math.floor(globalTotalClicks)}
          </p>
        </div>
      </div>

      {/* メインゲームエリア */}
      <div className="game-area">
        {/* スコア表示 */}
        <div className="score-display">
          <p className="score-label">あなたのスコア</p>
          <p className="score-value">{Math.floor(score)}</p>
        </div>

        {/* クリック可能な画像 */}
        <div className={`image-click-area ${isClicking ? 'clicked' : ''}`}>
          <div className="punch-container">
            <img
              src={displayImageUrl}
              alt="Click me to relieve stress"
              className={`clickable-image ${isClicking ? 'pulse' : ''}`}
              onClick={handleImageClick}
            />
            {/* パンチエフェクト表示 */}
            {punchEffects.map((punch) => (
              <div
                key={punch.id}
                className="punch-effect"
                style={{
                  left: `${punch.x}px`,
                  top: `${punch.y}px`,
                }}
              >
                👊
              </div>
            ))}
          </div>
          <p className="click-hint">クリックしてストレス解消！</p>
        </div>

        {/* 画像 URL 入力フォーム */}
        <div className="image-config-section">
          <h3>画像を変更する</h3>

          {/* URL 入力セクション */}
          <div className="config-subsection">
            <h4>URL から入力</h4>
            <div className="input-group">
              <input
                type="text"
                placeholder="画像 URL を入力してください..."
                value={imageUrlInput}
                onChange={(e) => setImageUrlInput(e.target.value)}
                className="image-url-input"
              />
              <button
                onClick={handleSaveImageUrl}
                className="config-button save"
              >
                保存
              </button>
              <button
                onClick={handleResetImageUrl}
                className="config-button reset"
              >
                リセット
              </button>
            </div>
            {customImageUrl && (
              <p className="current-url">URL: {customImageUrl}</p>
            )}
          </div>

          {/* ファイルアップロードセクション */}
          <div className="config-subsection">
            <h4>ファイルからアップロード</h4>
            <div className="file-upload-group">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="file-input"
                id="image-file-input"
              />
              <label htmlFor="image-file-input" className="file-label">
                📁 ファイルを選択
              </label>
              {uploadedImageUrl && (
                <button
                  onClick={handleResetUploadedImage}
                  className="config-button reset"
                >
                  クリア
                </button>
              )}
            </div>
            {uploadedImageUrl && (
              <p className="current-url">✓ 画像をアップロード済み</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;