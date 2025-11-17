import { useState, useEffect } from 'react';
import './App.css';

// --- ⬇️ Firebase 関連のインポートを更新 ⬇️ ---
import { db, auth } from './firebaseConfig'; // auth をインポート
import { doc, setDoc, onSnapshot, increment } from 'firebase/firestore';
// 認証 (Auth) で使う関数をインポート
import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  User // 10行目のコメントを削除しました
} from "firebase/auth";


// LocalStorageのキー (Step 4のまま)
const SAVE_KEY = 'my-clicker-game-save';

interface GameData {
  count: number;
  clickPower: number;
  aps: number;
  lastSavedAt: number;
}

// 接続するドキュメント（データ）の場所を定義
// 'global' -> 'stats' という名前のドキュメントに保存する
const globalStatsDocRef = doc(db, 'global', 'stats');


function App() {
  // --- ⬇️ ステートの初期化 (型指定) ⬇️ ---
  const [count, setCount] = useState<number>(() => {
    const savedData = localStorage.getItem(SAVE_KEY);
    return savedData ? JSON.parse(savedData).count : 0;
  });

  const [clickPower, setClickPower] = useState<number>(() => {
    const savedData = localStorage.getItem(SAVE_KEY);
    return savedData ? JSON.parse(savedData).clickPower : 1;
  });

  const [aps, setAps] = useState<number>(() => {
    const savedData = localStorage.getItem(SAVE_KEY);
    return savedData ? JSON.parse(savedData).aps : 0;
  });
  // --- ⬆️ 修正ここまで ⬆️ ---


  // --- ⬇️ ここから追加 (認証用) ⬇️ ---

  // ログインしているユーザーの情報を保存するステート
  const [user, setUser] = useState<User | null>(null);

  // useEffect (Auth): 認証状態を監視
  useEffect(() => {
    // onAuthStateChanged: ログイン状態が変わるたびに呼び出される
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser); // ログインしていればUserオブジェクト、していなければnull
    });
    // コンポーネントが不要になったら監視を解除
    return () => unsubscribe();
  }, []); // [] 空の配列 = 最初に1回だけ実行

  // Googleログイン処理
  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider(); // Google認証プロバイダー
    try {
      await signInWithPopup(auth, provider); // ポップアップでログイン
    } catch (error) {
      console.error("Google ログインエラー: ", error);
    }
  };

  // ログアウト処理
  const handleSignOut = async () => {
    try {
      await signOut(auth); // Firebaseからログアウト
    } catch (error) {
      console.error("ログアウトエラー: ", error);
    }
  };

  // --- ⬆️ ここまで追加 (認証用) ⬆️ ---


  // グローバルな合計クリック数を管理するステート
  const [globalTotalClicks, setGlobalTotalClicks] = useState<number | null>(null);

  // useEffect (1): Firestoreのデータを「リアルタイムで監視」する
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

  // useEffect (2): オフライン収益
  useEffect(() => {
    const savedDataString = localStorage.getItem(SAVE_KEY);
    if (!savedDataString) return;
    
    const savedData: GameData = JSON.parse(savedDataString);
    const now = Date.now();
    const lastSavedAt = savedData.lastSavedAt || now;
    const elapsedSeconds = Math.floor((now - lastSavedAt) / 1000);

    if (elapsedSeconds <= 0) return;

    const offlineEarnings = elapsedSeconds * savedData.aps;
    if (offlineEarnings > 0) {
      setCount(currentCount => currentCount + offlineEarnings);
      alert(`${elapsedSeconds}秒間の放置ボーナスとして\n${offlineEarnings} リソースを獲得しました！`);
    }
  }, []);

  // useEffect (3): 自動収益タイマー
  useEffect(() => {
    if (aps > 0) {
      const intervalId = setInterval(() => {
        setCount(currentCount => currentCount + aps);
      }, 1000);
      return () => clearInterval(intervalId);
    }
  }, [aps]);

  // useEffect (4): ローカルデータ保存
  useEffect(() => {
    // (将来的に：もしログインしていたら、LocalStorageではなくFirestoreに保存する)
    const gameData: GameData = {
      count: count,
      clickPower: clickPower,
      aps: aps,
      lastSavedAt: Date.now(),
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(gameData));
  }, [count, clickPower, aps]);


  // コスト計算
  const upgradeCost = 10 * clickPower;
  const autoClickerCost = 25 * (aps + 1);


  // 1. クリック関数 (Firebase対応)
  const handleClick = async () => {
    // 1. 自分のローカルリソースを増やす
    setCount(count + clickPower);

    // 2. グローバルな統計を更新
    try {
      await setDoc(globalStatsDocRef, { 
        totalClicks: increment(clickPower) 
      }, { merge: true });
      
    } catch (error) {
      console.error("Error updating global stats: ", error);
    }
    
    // (将来的に：もしログインしていたら、個人のスコアもFirestoreに保存する)
  };

  // 2. クリック強化関数
  const handleUpgrade = () => {
    if (count >= upgradeCost) {
      setCount(count - upgradeCost);
      setClickPower(clickPower + 1);
    } else {
      alert('リソースが足りません！');
    }
  };

  // 3. 自動化施設購入関数
  const handleBuyAutoClicker = () => {
    if (count >= autoClickerCost) {
      setCount(count - autoClickerCost);
      setAps(aps + 1);
    } else {
      alert('リソースが足りません！');
    }
  };


  // 4. 画面に表示する内容
  return (
    <>
      {/* --- ⬇️ ここから変更 (認証UI) ⬇️ --- */}
      <div className="auth-container" style={{ padding: '10px', backgroundColor: '#eee', marginBottom: '20px', borderRadius: '8px' }}>
        {user ? (
          // ログインしている場合
          <div>
            <p style={{ margin: 0, fontWeight: 'bold' }}>ようこそ、{user.displayName} さん</p>
            <button onClick={handleSignOut} style={{ marginTop: '5px' }}>ログアウト</button>
          </div>
        ) : (
          // ログインしていない場合
          <div>
            <p style={{ margin: 0, fontWeight: 'bold' }}>ログインして、ランキングに参加しよう！</p>
            <button onClick={handleGoogleSignIn} style={{ marginTop: '5px' }}>Googleでログイン</button>
          </div>
        )}
      </div>
      {/* --- ⬆️ ここまで変更 (認証UI) ⬆️ --- */}

      <h1>クリッカーゲーム (Firebase対応)</h1>

      {/* グローバル・クリック数 */}
      <div className="card" style={{ backgroundColor: '#f0f8ff' }}>
        <h2>グローバル・クリック数</h2>
        <h3>
          {globalTotalClicks === null ? '読込中...' : Math.floor(globalTotalClicks)}
        </h3>
        <p>（全ユーザーの合計クリック数）</p>
      </div>

      {/* 自分のリソース */}
      <div className="card">
        <h2>リソース: {Math.floor(count)}</h2>
        <p>（現在のクリックパワー: {clickPower}）</p>
        <p>（自動収益: 毎秒 {aps}）</p>
      </div>

      <button onClick={handleClick}>
        クリック ( +{clickPower} )
      </button>

      <div className="card">
        <button onClick={handleUpgrade}>
          クリックパワー強化
        </button>
        <p>次のコスト: {upgradeCost} リソース</p>
      </div>

      <div className="card">
        <button onClick={handleBuyAutoClicker}>
          自動化施設を購入
        </button>
        <p>次のコスト: {autoClickerCost} リソース</p>
      </div>
    </>
  );
}

export default App;