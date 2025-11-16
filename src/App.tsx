import { useState, useEffect } from 'react';
import './App.css';

// --- ⬇️ ここから追加 (Firebase) ⬇️ ---
import { db } from './firebaseConfig'; // 作成した設定ファイルをインポート
import { doc, setDoc, onSnapshot, increment } from 'firebase/firestore'; // Firestoreで使う関数
// --- ⬆️ ここまで追加 ⬆️ ---


// LocalStorageのキー (Step 4のまま)
const SAVE_KEY = 'my-clicker-game-save';

interface GameData {
  count: number;
  clickPower: number;
  aps: number;
  lastSavedAt: number;
}

// --- ⬇️ ここから追加 (ランキング用) ⬇️ ---

// Firestoreに保存する「グローバルデータ」の型
interface GlobalData {
  totalClicks: number;
}

// 接続するドキュメント（データ）の場所を定義
// 'global' -> 'stats' という名前のドキュメントに保存する
const globalStatsDocRef = doc(db, 'global', 'stats');

// --- ⬆️ ここまで追加 ⬆️ ---


function App() {
  // --- ⬇️ ステートの初期化を修正 ⬇️ ---

  // useState<number>(...) のように、<number> を追加
  const [count, setCount] = useState<number>(() => {
    const savedData = localStorage.getItem(SAVE_KEY);
    return savedData ? JSON.parse(savedData).count : 0;
  });

  // clickPower にも <number> を追加
  const [clickPower, setClickPower] = useState<number>(() => {
    const savedData = localStorage.getItem(SAVE_KEY);
    return savedData ? JSON.parse(savedData).clickPower : 1;
  });

  // aps にも <number> を追加
  const [aps, setAps] = useState<number>(() => {
    const savedData = localStorage.getItem(SAVE_KEY);
    return savedData ? JSON.parse(savedData).aps : 0;
  });

  // --- ⬆️ ステートの初期化 (Step 4のまま) ⬆️ ---


  // --- ⬇️ ここから追加 (ランキング用) ⬇️ ---

  // グローバルな合計クリック数を管理するステート
  const [globalTotalClicks, setGlobalTotalClicks] = useState<number | null>(null);

  // useEffect (1): Firestoreのデータを「リアルタイムで監視」する
  useEffect(() => {
    // onSnapshot: Firestoreのデータが変更されるたびに、この中の処理が自動で実行される
    const unsubscribe = onSnapshot(globalStatsDocRef, (doc) => {
      if (doc.exists()) {
        // データベースにデータがあれば、その 'totalClicks' の値をステートにセット
        setGlobalTotalClicks(doc.data().totalClicks);
      } else {
        // データがなければ (初回など)
        setGlobalTotalClicks(0);
      }
    });

    // コンポーネントが不要になったら監視を解除する (クリーンアップ)
    return () => unsubscribe();
    
    // [] (空の依存配列) は、「ページ読み込み時に1回だけ実行」
  }, []);

  // --- ⬆️ ここまで追加 ⬆️ ---


  // useEffect (2): オフライン収益 (Step 4のまま)
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

  // useEffect (3): 自動収益タイマー (Step 4のまま)
  useEffect(() => {
    if (aps > 0) {
      const intervalId = setInterval(() => {
        setCount(currentCount => currentCount + aps);
      }, 1000);
      return () => clearInterval(intervalId);
    }
  }, [aps]);

  // useEffect (4): ローカルデータ保存 (Step 4のまま)
  useEffect(() => {
    const gameData: GameData = {
      count: count,
      clickPower: clickPower,
      aps: aps,
      lastSavedAt: Date.now(),
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(gameData));
  }, [count, clickPower, aps]);


  // コスト計算 (Step 4のまま)
  const upgradeCost = 10 * clickPower;
  const autoClickerCost = 25 * (aps + 1);


  // 1. クリック関数 (ここをFirebase対応に変更！)
  const handleClick = async () => {
    // 1. 自分のローカルリソースを増やす
    setCount(count + clickPower);

    // --- ⬇️ ここから追加 (Firebaseへの書き込み) ⬇️ ---
    try {
      // 'global/stats' ドキュメントの 'totalClicks' フィールドを
      // 'clickPower' 分だけ「増やす」(increment)
      await setDoc(globalStatsDocRef, { 
        totalClicks: increment(clickPower) 
      }, { merge: true }); // merge: true は、ドキュメントの他のデータを壊さず追記するおまじない
      
    } catch (error) {
      console.error("Error updating global stats: ", error);
      // エラーが起きてもゲームは止めない
    }
    // --- ⬆️ ここまで追加 ⬆️ ---
  };

  // 2. クリック強化関数 (変更なし)
  const handleUpgrade = () => {
    if (count >= upgradeCost) {
      setCount(count - upgradeCost);
      setClickPower(clickPower + 1);
    } else {
      alert('リソースが足りません！');
    }
  };

  // 3. 自動化施設購入関数 (変更なし)
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
      <h1>クリッカーゲーム (Firebase対応)</h1>

      {/* --- ⬇️ ここから追加 (ランキング) ⬇️ --- */}
      <div className="card" style={{ backgroundColor: '#f0f8ff' }}>
        <h2>グローバル・クリック数</h2>
        <h3>
          {/* データベースから読み込んでいる間は "読込中..." と表示 */}
          {globalTotalClicks === null ? '読込中...' : Math.floor(globalTotalClicks)}
        </h3>
        <p>（全ユーザーの合計クリック数）</p>
      </div>
      {/* --- ⬆️ ここまで追加 ⬆️ --- */}


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