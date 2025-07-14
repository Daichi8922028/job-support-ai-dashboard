# Firebase保存エラー トラブルシューティングガイド

## 🚨 現在発生中のエラー

```
保存エラー: 保存権限がありません。ログイン状態を確認してください。
Error: Missing or insufficient permissions.
Code: permission-denied
```

## 📋 デバッグ手順

### 1. ブラウザ開発者ツールでログを確認

1. ブラウザで F12 を押して開発者ツールを開く
2. Console タブを確認
3. 以下のログを探す：

```
=== Firebase デバッグ情報 ===
=== Firebase初期化デバッグ ===
=== 保存処理デバッグ開始 ===
=== selfAnalysisMapService 保存開始 ===
```

### 2. 確認すべき項目

#### A. Firebase設定
- ✅ `hasApiKey: true`
- ✅ `validApiKeyFormat: true`
- ✅ `projectId: "jobhuntingappver2"`
- ✅ `authDomain: "jobhuntingappver2.firebaseapp.com"`

#### B. ユーザー認証状態
- ✅ `user: true`
- ✅ `userId: "xxxxx"`
- ✅ `email: "xxxxx"`
- ✅ `emailVerified: true`

#### C. Firebase接続
- ✅ `db: true`
- ✅ `auth: true`
- ✅ `Firebase認証トークン取得成功: true`

## 🛠️ 解決方法

### 方法1: Firebase Console でセキュリティルールを設定（推奨）

1. **Firebase Console にアクセス**
   ```
   https://console.firebase.google.com/project/jobhuntingappver2/firestore
   ```

2. **Firestore Database → ルール**

3. **以下のルールを適用**
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read, write: if request.auth != null;
       }
     }
   }
   ```

4. **「公開」をクリック**

### 方法2: より厳密なセキュリティルール（本番用）

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 自己分析マップへのアクセス
    match /selfAnalysisMaps/{mapId} {
      allow read, write: if request.auth != null && 
        (resource == null || resource.data.userId == request.auth.uid);
      allow create: if request.auth != null && 
        request.resource.data.userId == request.auth.uid;
    }
    
    // その他のドキュメント
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## 🔍 デバッグ出力の見方

### 正常な場合のログ
```
✅ Firebase API key format appears valid
✅ ユーザー認証状態: { user: true, userId: "abc123..." }
✅ Firebase認証トークン取得成功: true
🚀 saveSelfAnalysisMap 呼び出し開始
✅ 保存成功: doc_id_12345
```

### エラーの場合のログ
```
❌ 権限拒否: Firestoreセキュリティルールで拒否されました
🚫 権限拒否: Firestoreセキュリティルールで拒否されました
対処法: Firebase Console でセキュリティルールを確認してください
```

## 📱 段階的な確認手順

### Step 1: ログイン状態の確認
```javascript
// Console で実行
console.log('Current user:', firebase.auth().currentUser);
```

### Step 2: Firebase設定の確認
```javascript
// Console で実行
console.log('Firebase config:', {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY?.substring(0, 10) + '...',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID
});
```

### Step 3: 手動でFirestore接続テスト
```javascript
// Console で実行
import { db, collection, addDoc } from './firebase';
addDoc(collection(db, 'test'), { test: true })
  .then(doc => console.log('Test success:', doc.id))
  .catch(err => console.error('Test failed:', err));
```

## 🆘 緊急時の対処法

### 一時的な解決策
Firebase Console で以下の緩いルールを適用：

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;  // 警告: 本番では使用禁止
    }
  }
}
```

⚠️ **注意**: このルールは開発・テスト用のみ。本番環境では絶対に使用しないでください。

## 📞 サポート情報

### よくある原因
1. **Firestoreセキュリティルールが設定されていない**
2. **ユーザーがログアウトしている**
3. **Firebase プロジェクト ID が間違っている**
4. **API キーが無効**

### 追加のデバッグ
詳細なログは以下のファイルで確認：
- `pages/SelfAnalysisScreen.tsx` (line 470-560)
- `services/selfAnalysisMapService.ts` (line 60-150)
- `firebase.ts` (line 66-90)

## 🔗 参考リンク

- [Firebase Console](https://console.firebase.google.com/)
- [Firestore セキュリティルール](https://firebase.google.com/docs/firestore/security/rules-structure)
- [Firebase 認証](https://firebase.google.com/docs/auth)