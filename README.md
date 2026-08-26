# 和田小学校 教室・備品管理システム

校内の特別教室や備品を、直感的な操作でスムーズに検索・予約できるWebアプリケーションです。

## 主な機能
- **教室利用予約**: 1〜3階のマップやリストから教室を選び、1週間のカレンダーで空き枠をタップして予約できます。
- **備品検索・貸出**: 校内にある教材・備品を名前や保管場所で検索し、「誰が・何個」借りているかを管理できます。
- **マスターデータ一括管理**: 年度初めに、時間割・教室・備品・教職員のマスターデータをExcelファイルで一括登録できます。
- **パスワードロック**: マスター登録や、既存予約の強制上書きにはパスワード（`wada8817`）が必要です。
- **Excel出力**: 予約状況や貸出状況を、印刷や閲覧に適した綺麗なフォーマットでExcel出力できます。

## 技術スタック
- React (Vite)
- TypeScript
- Firebase (Firestore) — `src/firebase.ts` の設定で本番プロジェクトに直接接続します
- CSS Modules
- lucide-react (アイコン)

## 起動方法
```bash
npm install
npm run dev
```

## Firestoreのデータ構成
| コレクション | 内容 |
| --- | --- |
| `rooms` | 教室マスター（ドキュメントIDはExcelの「識別ID」） |
| `equipments` | 備品マスター＋貸出中リスト（`checkouts`） |
| `teachers` | 教職員マスター |
| `timetable` | 時間割マスター |
| `week_mappings` | A・B週の期間設定（`YYYY-MM-DD`で保存） |
| `reservations` | 予約データ（借用者が `【キャンセル】` の行は時間割の打ち消し） |

## Firebaseルールについて
`firestore.rules` は現在「誰でも読み書き可能」です。校内利用を前提とした暫定設定であり、
**URLを知っていれば誰でもデータを削除・改ざんできます。**
画面上のパスワード（`wada8817`）はクライアント側の誤操作防止であり、アクセス制御ではありません。

外部からのアクセスが想定される場合は、Firebase Authentication（Google認証など）を有効にしたうえで、
以下のようにルールを絞り込んでください。

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

## 既知の注意点
- 依存している `xlsx@0.18.5`（npm版）には既知の脆弱性報告があります。取り込むExcelは校内で作成したものに限定してください。
