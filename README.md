# 和田小学校 教室・備品管理システム

校内の特別教室や備品を、直感的な操作でスムーズに検索・予約できるWebアプリケーションです。

## 主な機能
- **教室利用予約**: 1〜3階のマップやリストから教室を選び、1週間のカレンダーで空き枠をタップして予約できます。
- **備品検索・貸出**: 校内にある教材・備品を検索し、「誰が・何個」借りているかを管理できます。
- **マスターデータ一括管理**: 年度初めに、時間割・教室・備品・教職員のマスターデータをExcelファイルで一括登録できます。
- **パスワードロック**: マスター登録や、既存予約の強制上書きにはパスワード（`wada8817`）が必要です。
- **Excel出力**: 予約状況や貸出状況を、印刷や閲覧に適した綺麗なフォーマットでExcel出力できます。

## 技術スタック
- React (Vite)
- TypeScript
- Firebase (Firestore) - ※現在はモックモードで動作中
- CSS Modules
- lucide-react (アイコン)

## 起動方法
```bash
npm install
npm run dev
```

## Firebaseルールについて
本番環境でFirestoreを使用する場合、Firebaseコンソールの「Firestore Database」＞「ルール」タブに以下のルールを設定してください。

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```
