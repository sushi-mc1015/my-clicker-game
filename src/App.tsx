import { Routes, Route, Link } from "react-router-dom";
import OrangutanGame from "./OrangutanGame";
import StressGame from "./StressGame";
import TermsOfService from "./TermsOfService";

function Home() {
  return (
    <div style={{ textAlign: "center", padding: 50 }}>
      <h1>Game Portal</h1>
      <div style={{ display: "flex", gap: 20, justifyContent: "center", marginTop: 30 }}>
        <Link to="/orangutan" style={{ border: "1px solid #ccc", padding: 20, borderRadius: 10 }}>
          <h2>🦧 Orangutan Jungle</h2>
          <button>プレイする</button>
        </Link>
        <Link to="/stress" style={{ border: "1px solid #ccc", padding: 20, borderRadius: 10 }}>
          <h2>👊 ストレス発散ゲーム</h2>
          <button>プレイする</button>
        </Link>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/orangutan" element={<OrangutanGame />} />
      <Route path="/stress" element={<StressGame />} />
      <Route path="/terms" element={<TermsOfService onClose={() => window.history.back()} />} />
    </Routes>
  );
}