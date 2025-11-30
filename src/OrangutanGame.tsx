// src/OrangutanGame.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { db, auth } from "./firebaseConfig";
import {
  doc, setDoc, collection, query, orderBy, limit, getDocs,
} from "firebase/firestore";
import {
  onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut, type User,
} from "firebase/auth";
import { playPunchSound } from "./soundManager";

type RankRow = { userId: string; name: string; score: number; photoURL?: string };
type GameState = "idle" | "playing" | "paused" | "ended";

const DURATION = 60; // 秒
const BONUS_INTERVAL_MS = 4500;

export default function OrangutanGame() {
  const [user, setUser] = useState<User | null>(null);
  const [gameState, setGameState] = useState<GameState>("idle");
  const [timeLeft, setTimeLeft] = useState<number>(DURATION);

  const [score, setScore] = useState(0);
  const [bestLocal, setBestLocal] = useState<number>(() => Number(localStorage.getItem("orangutan-best") || 0));
  const [combo, setCombo] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const [stamina, setStamina] = useState(100);
  const [cooling, setCooling] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: 50, y: 50 });

  const [bonusVisible, setBonusVisible] = useState(false);
  const [bonusPos, setBonusPos] = useState<{ x: number; y: number }>({ x: 30, y: 30 });

  const [ranking, setRanking] = useState<RankRow[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  const lastClickRef = useRef<number>(0);
  const timerRef = useRef<number | null>(null);
  const bonusTimerRef = useRef<number | null>(null);

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  // ===== ランキング =====
  const fetchRanking = async () => {
    const q = query(collection(db, "orangutan_users"), orderBy("score", "desc"), limit(10));
    const snap = await getDocs(q);
    const rows: RankRow[] = snap.docs.map((d) => ({
      userId: d.id,
      name: d.data().name || "Anonymous",
      score: d.data().score || 0,
      photoURL: d.data().photoURL,
    }));
    setRanking(rows);
  };
  useEffect(() => {
    fetchRanking();
    const t = window.setInterval(fetchRanking, 8000);
    return () => window.clearInterval(t);
  }, []);

  // ===== コンボ倍率 =====
  const comboMultiplier = useMemo(() => {
    if (combo >= 40) return 6;
    if (combo >= 30) return 4;
    if (combo >= 20) return 3;
    if (combo >= 10) return 2;
    return 1;
  }, [combo]);
  useEffect(() => setMultiplier(comboMultiplier), [comboMultiplier]);

  // ===== スタミナ回復 =====
  useEffect(() => {
    if (gameState !== "playing") return;
    const id = window.setInterval(() => {
      setStamina((s) => Math.min(100, s + 2));
      setCooling((c) => (c && stamina > 60 ? false : c));
    }, 150);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState, stamina]);

  // ===== タイマー =====
  const startTimer = () => {
    timerRef.current && window.clearInterval(timerRef.current);
    setTimeLeft(DURATION);
    timerRef.current = window.setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          window.clearInterval(timerRef.current!);
          endGame();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  };

  // ===== ボーナス出現 =====
  const startBonus = () => {
    bonusTimerRef.current && window.clearInterval(bonusTimerRef.current);
    bonusTimerRef.current = window.setInterval(() => {
      // 2秒だけ表示
      setBonusPos({ x: 10 + Math.random() * 80, y: 20 + Math.random() * 60 });
      setBonusVisible(true);
      window.setTimeout(() => setBonusVisible(false), 2000);
    }, BONUS_INTERVAL_MS);
  };

  const stopAllTimers = () => {
    timerRef.current && window.clearInterval(timerRef.current);
    bonusTimerRef.current && window.clearInterval(bonusTimerRef.current);
  };

  // ===== ゲーム開始/終了/ポーズ =====
  const startGame = () => {
    setScore(0);
    setCombo(0);
    setMultiplier(1);
    setStamina(100);
    setCooling(false);
    setGameState("playing");
    startTimer();
    startBonus();
    moveOrangutan();
  };

  const pauseGame = () => {
    if (gameState !== "playing") return;
    setGameState("paused");
    stopAllTimers();
  };

  const resumeGame = () => {
    if (gameState !== "paused") return;
    setGameState("playing");
    startTimer();
    startBonus();
  };

  const endGame = async () => {
    setGameState("ended");
    stopAllTimers();
    // ローカルベスト更新
    setBestLocal((prev) => {
      const next = Math.max(prev, score);
      localStorage.setItem("orangutan-best", String(next));
      return next;
    });
    // 保存（ログイン時）
    try {
      if (user) {
        const ref = doc(db, "orangutan_users", user.uid);
        await setDoc(
          ref,
          {
            name: user.displayName || "Anonymous",
            photoURL: user.photoURL || null,
            score: score,
            updatedAt: new Date(),
          },
          { merge: true }
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  // ===== 入出力 =====
  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };
  const handleLogout = async () => {
    await signOut(auth);
  };

  const moveOrangutan = () => {
    setPos({ x: 10 + Math.random() * 80, y: 15 + Math.random() * 65 });
  };

  const clickCommon = (gainBase = 1) => {
    if (gameState !== "playing") return;
    if (cooling) return;
    if (stamina <= 0) {
      setCooling(true);
      return;
    }
    // コンボ計算
    const now = performance.now();
    const dt = now - (lastClickRef.current || 0);
    lastClickRef.current = now;
    if (dt < 450) setCombo((c) => c + 1);
    else setCombo(1);

    const gain = gainBase * multiplier;
    setScore((s) => s + gain);
    setStamina((s) => Math.max(0, s - (1.8 + multiplier)));
    playPunchSound?.();
  };

  const onApeClick = () => {
    clickCommon(1);
    moveOrangutan();
    // 実績
    if (score + 1 >= 100 && score < 100) showToast("🏅 実績：100バナナ達成！");
    if (combo >= 20 && (score % 5 === 0)) showToast("🔥 コンボ20+！");
  };

  const onBonusClick = () => {
    if (!bonusVisible) return;
    clickCommon(10);
    setBonusVisible(false);
    showToast("🍌 ゴールデンバナナ +10！");
  };

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 1300);
  };

  // ===== UI =====
  return (
    <div className="og-root">
      <header className="og-header">
        <div>
          <Link to="/" className="og-link">← Home</Link>
        </div>
        <div className="og-auth">
          {user ? (
            <>
              <span>ようこそ <b>{user.displayName}</b> さん</span>
              <button onClick={handleLogout} className="og-btn">ログアウト</button>
            </>
          ) : (
            <button onClick={handleLogin} className="og-btn">Googleでログイン</button>
          )}
        </div>
      </header>

      <main className="og-main">
        {/* ゲームエリア */}
        <section
          className={`og-stage ${gameState !== "playing" ? "dim" : ""}`}
          style={{
            backgroundImage: "url('/assets/jungle.jpg')",
          }}
        >
          {/* オラウータン（クリック対象） */}
          <button
            onClick={onApeClick}
            onTouchStart={(e) => { e.preventDefault(); onApeClick(); }}
            className="og-ape"
            style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
            aria-label="Collect banana"
          >
            <img src="/assets/orangutan.png" alt="orangutan" draggable={false} />
          </button>

          {/* ボーナスバナナ */}
          {bonusVisible && (
            <button
              onClick={onBonusClick}
              onTouchStart={(e) => { e.preventDefault(); onBonusClick(); }}
              className="og-bonus"
              style={{ left: `${bonusPos.x}%`, top: `${bonusPos.y}%` }}
              aria-label="Golden banana"
              title="+10"
            >
              <img src="/assets/golden-banana.png" alt="golden banana" draggable={false} />
            </button>
          )}

          {/* トースト */}
          {toast && <div className="og-toast">{toast}</div>}

          {/* オーバーレイ（開始・一時停止・終了） */}
          {gameState !== "playing" && (
            <div className="og-overlay">
              {gameState === "idle" && (
                <>
                  <h2>🦧 Orangutan Jungle</h2>
                  <p>60秒でスコアを稼ごう！</p>
                  <button className="og-cta" onClick={startGame}>▶ スタート</button>
                </>
              )}
              {gameState === "paused" && (
                <>
                  <h2>一時停止</h2>
                  <button className="og-cta" onClick={resumeGame}>▶ 再開</button>
                </>
              )}
              {gameState === "ended" && (
                <>
                  <h2>結果</h2>
                  <p>スコア：<b>{score}</b></p>
                  <p>自己ベスト：<b>{bestLocal}</b></p>
                  <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                    <button className="og-cta" onClick={startGame}>↺ もう一度</button>
                    <Link to="/howto" className="og-cta og-link-btn">📒 遊び方</Link>
                  </div>
                </>
              )}
            </div>
          )}

          {/* 右上：タイマー */}
          <div className="og-timer">
            ⏱ {timeLeft}s
            {gameState === "playing" && (
              <button className="og-mini" onClick={pauseGame} title="一時停止">⏸</button>
            )}
          </div>
        </section>

        {/* パネル */}
        <aside className="og-panel">
          <h2>🟡 スコア：{score.toLocaleString()}</h2>
          <p>🔥 コンボ：{combo}（x{multiplier}）</p>

          <div className="og-bar">
            <div className="og-bar-top">
              <span>⚡ スタミナ</span>
              <span>{stamina}% {cooling ? "（回復中）" : ""}</span>
            </div>
            <div className="og-bar-rail">
              <div className="og-bar-fill" style={{ width: `${stamina}%` }} />
            </div>
          </div>

          <hr className="og-hr" />
          <h3>🏆 ランキング</h3>
          <div className="og-ranklist">
            {ranking.map((r, i) => (
              <div key={r.userId} className="og-rankrow">
                <div>{i + 1}</div>
                <div className="og-rankname" title={r.name}>{r.name}</div>
                <div>{r.score.toLocaleString()}</div>
              </div>
            ))}
            {ranking.length === 0 && <p>まだスコアがありません</p>}
          </div>
          <hr className="og-hr" />
          <Link to="/howto" className="og-link">📒 遊び方を見る</Link>
        </aside>
      </main>
    </div>
  );
}
