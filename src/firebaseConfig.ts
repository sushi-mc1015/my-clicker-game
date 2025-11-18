// src/firebaseConfig.ts
// 以下の内容でファイル全体を「置き換え」てください

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth"; // 認証機能 (Auth) をインポート

// あなたのWebアプリのFirebase設定
// (あなたの正しい設定値です)
const firebaseConfig = {
  apiKey: "AIzaSyCGk5_IqqLcaDmb8CakKJlmt_TrqsiNeeU",
  authDomain: "my-clicker-game-7a039.firebaseapp.com",
  projectId: "my-clicker-game-7a039",
  storageBucket: "my-clicker-game-7a039.firebasestorage.app",
  messagingSenderId: "1095738557700",
  appId: "1:1095738557700:web:0b852fbd73cc04e0bffc51",
  measurementId: "G-84L1DKRQ9G"
};

// Firebaseアプリを初期化
const app = initializeApp(firebaseConfig);

// Firestoreのインスタンスを取得
const db = getFirestore(app);
// 認証のインスタンスを取得
const auth = getAuth(app);

// 他のファイル (App.tsx など) で 'db' と 'auth' の両方を使えるようにエクスポート
export { db, auth };

// Vercelに強制的に変更を認識させるためのコメント