import { Routes, Route, Link } from "react-router-dom";
import OrangutanGame from "./OrangutanGame";
import StressGame from "./StressGame";
import TermsOfService from "./TermsOfService";

// ホーム画面（メニュー）
function Home() {
  return (
    <div className="home-container" style={containerStyle}>
      <h1 style={{ fontSize: "3rem", marginBottom: "10px" }}>🎮 Game Portal</h1>
      <p style={{ fontSize: "1.2rem", color: "#666", marginBottom: "40px" }}>
        遊びたいゲームを選んでください
      </p>
      
      <div style={gridStyle}>
        <Link to="/orangutan" style={cardStyle}>
          <div style={iconStyle}>🦧</div>
          <h2 style={{ margin: "10px 0" }}>Orangutan Jungle</h2>
          <button style={buttonStyle}>プレイする</button>
        </Link>

        <Link to="/stress" style={cardStyle}>
          <div style={iconStyle}>👊</div>
          <h2 style={{ margin: "10px 0" }}>ストレス発散ゲーム</h2>
          <button style={buttonStyle}>プレイする</button>
        </Link>
      </div>
      
      <footer style={{ marginTop: "60px", borderTop: "1px solid #eee", paddingTop: "20px" }}>
        <Link to="/terms" style={{ color: "#888", textDecoration: "underline" }}>利用規約</Link>
      </footer>
    </div>
  );
}

// Appコンポーネント
export default function App() {
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

// スタイル
const containerStyle: React.CSSProperties = { textAlign: "center", padding: "50px 20px", background: "#f0f2f5", minHeight: "100vh", color: "#333", fontFamily: "sans-serif" };
const gridStyle: React.CSSProperties = { display: "flex", gap: "30px", justifyContent: "center", flexWrap: "wrap" };
const cardStyle: React.CSSProperties = { background: "white", borderRadius: "16px", padding: "30px", width: "300px", textDecoration: "none", color: "inherit", display: "flex", flexDirection: "column", alignItems: "center", boxShadow: "0 10px 25px rgba(0,0,0,0.05)" };
const iconStyle: React.CSSProperties = { fontSize: "4rem", marginBottom: "10px" };
const buttonStyle: React.CSSProperties = { marginTop: "20px", padding: "10px 24px", background: "#667eea", color: "white", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: "pointer" };