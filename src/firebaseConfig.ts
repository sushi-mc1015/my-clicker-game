// src/firebaseConfig.ts
// 以下の内容でファイル全体を置き換えてください

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

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

// Firestoreのインスタンスを取得し、他ファイルで使えるように名前付きでエクスポート
export const db = getFirestore(app);