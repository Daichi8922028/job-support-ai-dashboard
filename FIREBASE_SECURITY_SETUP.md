# Firebase Firestore セキュリティルール設定ガイド

## 問題
現在、Firestoreで `permission-denied` エラーが発生しています。これは適切なセキュリティルールが設定されていないためです。

## 解決方法

### 方法1: Firebase Console での手動設定（推奨）

1. **Firebase Console にアクセス**
   - https://console.firebase.google.com/ を開く
   - プロジェクト `jobhuntingappver2` を選択

2. **Firestore Database を開く**
   - 左サイドバーから "Firestore Database" を選択
   - "ルール" タブをクリック

3. **セキュリティルールを更新**
   以下のルールをコピーして貼り付け：

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // ユーザーは認証された場合のみ自分のデータにアクセス可能
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // プロファイルデータへのアクセス
    match /profiles/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // 自己分析マップへのアクセス
    match /selfAnalysisMaps/{mapId} {
      allow read, write: if request.auth != null && 
        (resource == null || resource.data.userId == request.auth.uid);
      allow create: if request.auth != null && 
        request.resource.data.userId == request.auth.uid;
    }
    
    // チャットセッションへのアクセス
    match /chatSessions/{sessionId} {
      allow read, write: if request.auth != null && 
        (resource == null || resource.data.userId == request.auth.uid);
      allow create: if request.auth != null && 
        request.resource.data.userId == request.auth.uid;
    }
    
    // 企業分析データへのアクセス
    match /companyAnalysis/{analysisId} {
      allow read, write: if request.auth != null && 
        (resource == null || resource.data.userId == request.auth.uid);
      allow create: if request.auth != null && 
        request.resource.data.userId == request.auth.uid;
    }
    
    // 業界分析データへのアクセス
    match /industryAnalysis/{analysisId} {
      allow read, write: if request.auth != null && 
        (resource == null || resource.data.userId == request.auth.uid);
      allow create: if request.auth != null && 
        request.resource.data.userId == request.auth.uid;
    }
    
    // その他のドキュメントは認証されたユーザーのみアクセス可能
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

4. **ルールを公開**
   - "公開" ボタンをクリックして変更を適用

### 方法2: Firebase CLI での設定（CLI インストール後）

```bash
# Firebase にログイン
firebase login

# プロジェクトを初期化
firebase init firestore

# ルールをデプロイ
firebase deploy --only firestore:rules
```

## 一時的な解決策（開発用のみ）

開発中のテスト用に、より緩い権限設定も可能です：

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

**⚠️ 注意**: この設定は本番環境では使用しないでください。

## 確認方法

1. ルールを適用後、アプリケーションをリロード
2. ログインしていることを確認
3. 自己分析マップの保存を再試行

## トラブルシューティング

### ログイン状態の確認
- ブラウザの開発者ツールでコンソールを確認
- `Firebase認証状態:` のログが表示されているか確認
- ユーザーの `uid` が正しく表示されているか確認

### ネットワークエラーの確認
- ブラウザのNetworkタブでFirestoreリクエストを確認
- 400/403エラーが表示されている場合はルール設定を再確認

## 参考リンク

- [Firestore セキュリティルール公式ドキュメント](https://firebase.google.com/docs/firestore/security/rules-structure)
- [Firebase Console](https://console.firebase.google.com/)