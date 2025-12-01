import { Routes, Route, Link } from "react-router-dom";
import OrangutanGame from "./OrangutanGame";
import StressGame from "./StressGame";
import TermsOfService from "./TermsOfService";
import { useState } from "react";

// ホーム画面（メニュー）のコンポーネント
function Home() {
  return (
    <div className="home-container" style={containerStyle}>
      <h1 style={{ fontSize: "3rem", marginBottom: "10px" }}>🎮 Game Portal</h1>
      <p style={{ fontSize: "1.2rem", color: "#666", marginBottom: "40px" }}>
        遊びたいゲームを選んでください
      </p>
      
      <div style={gridStyle}>
        {/* オラウータンゲームへのリンク */}
        <Link to="/orangutan" style={cardStyle}>
          <div style={iconStyle}>🦧</div>
          <h2 style={{ margin: "10px 0" }}>Orangutan Jungle</h2>
          <p style={{ fontSize: "0.9rem", color: "#555" }}>
            バナナを集めてランキングを目指せ！<br/>アクション要素あり
          </p>
          <button style={buttonStyle}>プレイする</button>
        </Link>

        {/* ストレス発散ゲームへのリンク */}
        <Link to="/stress" style={cardStyle}>
          <div style={iconStyle}>👊</div>
          <h2 style={{ margin: "10px 0" }}>ストレス発散ゲーム</h2>
          <p style={{ fontSize: "0.9rem", color: "#555" }}>
            クリック連打でストレス解消！<br/>ランキング機能つき
          </p>
          <button style={buttonStyle}>プレイする</button>
        </Link>
      </div>
      
      <footer style={{ marginTop: "60px", borderTop: "1px solid #eee", paddingTop: "20px" }}>
        <Link to="/terms" style={{ color: "#888", textDecoration: "underline" }}>利用規約</Link>
      </footer>
    </div>
  );
}

// Appコンポーネント（画面の切り替え管理）
export default function App() {
  const [showTerms, setShowTerms] = useState(false);

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/orangutan" element={<OrangutanGame />} />
      <Route path="/stress" element={<StressGame />} />
      <Route path="/terms" element={
        <div style={{ padding: 20 }}>
           <Link to="/">← Homeに戻る</Link>
           <TermsOfService onClose={() => window.history.back()} />
        </div>
      } />
    </Routes>
  );
}

// --- 簡易スタイル定義 ---
const containerStyle: React.CSSProperties = {
  textAlign: "center",
  padding: "50px 20px",
  fontFamily: "'Helvetica Neue', Arial, sans-serif",
  minHeight: "100vh",
  background: "#f0f2f5",
  color: "#333"
};

const gridStyle: React.CSSProperties = {
  display: "flex",
  gap: "30px",
  justifyContent: "center",
  flexWrap: "wrap",
  maxWidth: "900px",
  margin: "0 auto"
};

const cardStyle: React.CSSProperties = {
  background: "white",
  borderRadius: "16px",
  padding: "30px",
  textDecoration: "none",
  color: "inherit",
  width: "300px",
  boxShadow: "0 10px 25px rgba(0,0,0,0.05)",
  transition: "transform 0.2s, box-shadow 0.2s",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  cursor: "pointer",
  border: "1px solid transparent"
};

const iconStyle: React.CSSProperties = {
  fontSize: "4rem",
  marginBottom: "10px"
};

const buttonStyle: React.CSSProperties = {
  marginTop: "20px",
  padding: "10px 24px",
  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  color: "white",
  border: "none",
  borderRadius: "8px",
  fontSize: "1rem",
  fontWeight: "bold",
  cursor: "pointer"
};