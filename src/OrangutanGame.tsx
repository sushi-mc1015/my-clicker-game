import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { db, auth } from "./firebaseConfig";
import {
  doc,
  setDoc,
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  getDoc,
  serverTimestamp
} from "firebase/firestore";
import {
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  type User,
} from "firebase/auth";
import "./App.css"; // 共通スタイル

// --- 定数 ---
const DISPLAY_COOLDOWN = 10; // ディスプレイのクールダウン（秒）

// ランキングデータの型
type RankRow = { userId: string; name: string; dominance: number; strength: number };

export default function OrangutanGame() {
  // --- ユーザー & データ ---
  const [user, setUser] = useState<User | null>(null);
  const [strength, setStrength] = useState(10); // 現在の攻撃力
  const [dominance, setDominance] = useState(0); // 支配力（スコア）
  const [ranking, setRanking] = useState<RankRow[]>([]);
  
  // --- ゲーム状態 ---
  const [lastDisplayTime, setLastDisplayTime] = useState(0); // 最後にディスプレイした時刻
  const [cooldown, setCooldown] = useState(0); // 残りクールダウン秒数
  const [isDisplaying, setIsDisplaying] = useState(false); // 演出用フラグ

  // --- 認証 & データロード ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // ユーザー固有のステータスを読み込む
        // (コレクション名を 'orangutan_stats' に変更して、以前のゲームとデータを分けます)
        const docRef = doc(db, "orangutan_stats", currentUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setStrength(data.strength || 10);
          setDominance(data.dominance || 0);
          
          // クールダウン（残り時間）の計算
          const lastTime = data.lastDisplayTime?.toMillis() || 0;
          const now = Date.now();
          const elapsedSec = (now - lastTime) / 1000;
          const remain = Math.max(0, DISPLAY_COOLDOWN - elapsedSec);
          setCooldown(Math.floor(remain));
          setLastDisplayTime(lastTime);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // --- ランキング監視 (リアルタイム) ---
  useEffect(() => {
    // 支配力(dominance)の高い順にトップ10を取得
    const q = query(
      collection(db, "orangutan_stats"),
      orderBy("dominance", "desc"),
      limit(10)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ranks: RankRow[] = snapshot.docs.map((doc) => ({
        userId: doc.id,
        name: doc.data().name,
        dominance: doc.data().dominance,
        strength: doc.data().strength,
      }));
      setRanking(ranks);
    });
    return () => unsubscribe();
  }, []);

  // --- クールダウンタイマーの処理 ---
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setInterval(() => {
        setCooldown((prev) => Math.max(0, prev - 1));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [cooldown]);

  // --- アクション: 筋トレ (攻撃力UP) ---
  const train = () => {
    // クリックするたびに攻撃力が上がる
    setStrength((prev) => prev + 1);
    
    // 簡易的な演出
    const btn = document.getElementById("train-btn");
    if (btn) {
      btn.style.transform = "scale(0.95)";
      setTimeout(() => btn.style.transform = "scale(1)", 100);
    }
  };

  // --- アクション: ディスプレイ (スコア獲得) ---
  const performDisplay = async () => {
    if (cooldown > 0) return; // クールダウン中は実行不可
    if (!user) {
      alert("ディスプレイを行って群れにアピールするには、ログインが必要です！");
      return;
    }

    setIsDisplaying(true); // 演出開始
    setTimeout(() => setIsDisplaying(false), 1000); // 1秒後に演出終了

    // スコア計算: 現在の攻撃力 × ランダムボーナス(1.0~1.5倍)
    // 強い状態でディスプレイするほど、群れへの影響力(スコア)が高まる
    const bonus = 1.0 + Math.random() * 0.5;
    const gainedDominance = Math.floor(strength * bonus);
    
    const newDominance = dominance + gainedDominance;
    setDominance(newDominance);
    
    // クールダウン設定
    setCooldown(DISPLAY_COOLDOWN);
    const now = Date.now();
    setLastDisplayTime(now);

    // 攻撃力を少しリセットしない（今回は維持する仕様）
    // もし維持を難しくするなら、ここで setStrength(prev => prev * 0.9) などにする

    // データベースに保存
    try {
      await setDoc(doc(db, "orangutan_stats", user.uid), {
        name: user.displayName || "Unknown",
        strength: strength,
        dominance: newDominance,
        lastDisplayTime: serverTimestamp(),
      }, { merge: true });
    } catch (e) {
      console.error("Save failed", e);
    }
  };

  // --- ログイン処理 ---
  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (e) {
      console.error(e);
    }
  };

  // 現在のトップ（ボス）を特定
  const boss = ranking.length > 0 ? ranking[0] : null;
  const isUserBoss = user && boss && user.uid === boss.userId;

  return (
    <div className="stress-relief-container">
      <Link to="/" style={{ position: "absolute", top: 20, left: 20, textDecoration: "none", fontSize: "2rem" }}>
        🏠
      </Link>

      <div style={{ marginTop: 60, textAlign: "center", width: "100%", maxWidth: 600 }}>
        <h1 style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🦧 Boss of the Jungle</h1>
        <p style={{ color: "#eee", fontSize: "0.9rem" }}>攻撃力を高めてディスプレイ(威嚇)し、群れのボスを目指せ！</p>
        
        {/* --- ボス表示エリア --- */}
        <div className="card" style={{ 
          background: "linear-gradient(135deg, #ffd700 0%, #ff8c00 100%)", 
          color: "#000",
          marginBottom: 20,
          transform: isUserBoss ? "scale(1.05)" : "scale(1)",
          border: "4px solid #fff",
          boxShadow: "0 0 20px rgba(255, 215, 0, 0.6)"
        }}>
          <h2 style={{ margin: 0, fontSize: "1.2rem" }}>👑 Current Boss (現在のボス)</h2>
          {boss ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 15, marginTop: 10 }}>
              <span style={{ fontSize: "3rem" }}>🦍</span>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontWeight: "bold", fontSize: "1.4rem" }}>{boss.name}</div>
                <div style={{ fontSize: "1rem" }}>支配力: {boss.dominance.toLocaleString()}</div>
                <div style={{ fontSize: "0.8rem", opacity: 0.8 }}>攻撃力: {boss.strength.toLocaleString()}</div>
              </div>
            </div>
          ) : (
            <p>ボスはまだいない... 今がチャンスだ！</p>
          )}
        </div>

        {/* --- プレイヤーのアクションエリア --- */}
        <div className="card" style={{ position: "relative", overflow: "hidden" }}>
          
          {/* オランウータンアイコン（演出用） */}
          <div style={{ 
            fontSize: "8rem", 
            margin: "20px 0",
            transition: "transform 0.2s",
            transform: isDisplaying ? "scale(1.5) rotate(-5deg)" : "scale(1)",
            filter: isDisplaying ? "drop-shadow(0 0 30px red)" : "none",
            cursor: "pointer",
            userSelect: "none"
          }} onClick={train}>
            🦧
          </div>

          {/* ステータス表示 */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
            {/* 攻撃力 */}
            <div style={{ background: "rgba(255,255,255,0.1)", padding: 10, borderRadius: 8 }}>
              <div style={{ fontSize: "0.8rem", color: "#ccc" }}>現在の攻撃力 (Strength)</div>
              <div style={{ fontSize: "1.8rem", fontWeight: "bold", color: "#ff5252" }}>
                {strength.toLocaleString()}
              </div>
            </div>
            {/* 支配力 */}
            <div style={{ background: "rgba(255,255,255,0.1)", padding: 10, borderRadius: 8 }}>
              <div style={{ fontSize: "0.8rem", color: "#ccc" }}>支配力 (Dominance)</div>
              <div style={{ fontSize: "1.8rem", fontWeight: "bold", color: "#448aff" }}>
                {dominance.toLocaleString()}
              </div>
            </div>
          </div>

          {/* アクションボタン */}
          <div style={{ display: "flex", gap: 10, flexDirection: "column" }}>
            
            {/* 1. 筋トレボタン */}
            <button 
              id="train-btn"
              onClick={train}
              style={{ 
                padding: "15px", 
                fontSize: "1.2rem", 
                background: "#d32f2f",
                border: "none",
                borderBottom: "4px solid #b71c1c",
                transition: "transform 0.1s"
              }}
            >
              💪 筋トレする (+1 Strength)
            </button>

            {/* 2. ディスプレイボタン */}
            <button 
              onClick={performDisplay}
              disabled={cooldown > 0}
              style={{ 
                padding: "15px", 
                fontSize: "1.2rem", 
                background: cooldown > 0 ? "#757575" : "#fbc02d",
                color: cooldown > 0 ? "#ccc" : "#000",
                fontWeight: "bold",
                border: "none",
                borderBottom: cooldown > 0 ? "none" : "4px solid #f57f17",
                position: "relative",
                overflow: "hidden"
              }}
            >
              {cooldown > 0 ? (
                <span>💤 休憩中... ({cooldown}s)</span>
              ) : (
                <span>📢 ディスプレイ (威嚇)！</span>
              )}
              
              {/* クールダウンバー */}
              {cooldown > 0 && (
                <div style={{
                  position: "absolute",
                  bottom: 0, left: 0, height: 5,
                  background: "#42a5f5",
                  width: `${(cooldown / DISPLAY_COOLDOWN) * 100}%`,
                  transition: "width 1s linear"
                }} />
              )}
            </button>
            <small style={{ color: "#aaa", marginTop: 5 }}>
              ※「ディスプレイ」をすると、現在の攻撃力に応じて支配力（スコア）が大幅に増えます！
            </small>
          </div>

          {/* 未ログイン時のカバー */}
          {!user && (
            <div style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0,0,0,0.85)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 10,
              borderRadius: 16
            }}>
              <h3 style={{ color: "#fff" }}>群れに参加してボスを目指そう</h3>
              <button onClick={handleLogin} style={{ background: "#4285f4", border: "none", padding: "10px 20px" }}>
                Googleでログイン
              </button>
            </div>
          )}
        </div>

        {/* --- ランキング表 --- */}
        <div className="card" style={{ marginTop: 20, textAlign: "left" }}>
          <h3 style={{ borderBottom: "1px solid #555", paddingBottom: 10 }}>🌲 群れの階級 (Ranking)</h3>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {ranking.map((rank, index) => (
              <li key={rank.userId} style={{ 
                padding: "12px", 
                borderBottom: "1px solid #444",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: rank.userId === user?.uid ? "rgba(255, 215, 0, 0.2)" : "transparent",
                borderRadius: 4,
                marginBottom: 2
              }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <span style={{ fontWeight: "bold", width: 30, color: index === 0 ? "#ffd700" : "#fff" }}>
                    #{index + 1}
                  </span>
                  <span>{rank.name}</span>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: "bold", fontSize: "1.1rem" }}>{rank.dominance.toLocaleString()}</div>
                  <div style={{ fontSize: "0.7rem", color: "#aaa" }}>ATK: {rank.strength}</div>
                </div>
              </li>
            ))}
            {ranking.length === 0 && <li style={{ padding: 20, textAlign: "center", color: "#777" }}>まだ誰もいない...</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}