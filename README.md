# AI-Chat-App

個人開発のWebアプリケーション。フロントエンドとバックエンドを1つのリポジトリで管理するモノレポ構成。

## 技術スタック

| 領域 | 技術 | 補足 |
| --- | --- | --- |
| フロントエンド | Next.js (TypeScript, App Router) | React ベース |
| バックエンド | FastAPI (Python) | REST API。DBへの唯一のアクセス経路 |
| データベース | Supabase (PostgreSQL) | リージョン: Northeast Asia (Tokyo)。Freeプラン |
| バージョン管理 | GitHub | Private リポジトリ |
| 開発環境 | Cursor + Claude Code拡張機能 | Mac |

## リポジトリ構成(モノレポ)

```
AI-Chat-App/
├─ README.md
├─ .gitignore
├─ frontend/          Next.js プロジェクト
│  ├─ .env.local      (git管理外)
│  └─ ...
├─ backend/
│  ├─ main.py
│  ├─ requirements.txt
│  ├─ .env            (git管理外。Supabase接続情報)
│  └─ .env.example    (プレースホルダーのみ、git管理する)
└─ db/
   └─ migrations/     DBスキーマ変更はすべてここ経由
```

## アーキテクチャ上の重要な決定事項

- フロントエンドは直接Supabaseを操作しない。すべてのデータアクセスはFastAPI経由で行う。
- そのため、Supabaseプロジェクト作成時の「安全」設定は以下の通り意図的にOFFにしている:
  - データAPI(PostgREST自動生成): OFF
  - 新しいテーブルを自動的に公開: OFF
  - 自動RLS: 未設定のままでよい(フロントが直接触らないため不要)
- DBスキーマの変更は必ずマイグレーションファイル経由で行う。SupabaseのDashboard(SQL Editor / Table Editor)で直接テーブルを変更しない。
  - 新規マイグレーション作成: `supabase migration new <説明>`
  - ローカル適用・検証: `supabase db reset`
  - 本番反映: `supabase link` → `supabase db push`
- `.env` 系ファイルは全て `.gitignore` 済み。接続文字列やパスワードを絶対にコミットしない。

## Supabase接続(backend/.env の形式)

```
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

- 常時起動するバックエンド(FastAPI)からの接続なので、Direct connection形式を使用
- パスワードに記号(`&`, `#`など)が含まれる場合はURLエンコードが必要

## 開発フロー(日常運用)

1. コードを編集
2. ローカルでDBスキーマを変えたい場合は、必ずマイグレーションファイルを新規作成
3. `git add` → `git commit` → `git push`
   - Source ControlパネルまたはターミナルでのGit操作、どちらでも可

## 今後の展望(まだ未着手)

- GitHub Actionsなどで、mainブランチへのマージ時に自動で `supabase db push` を実行する仕組み(現在は手動運用)
- Supabaseの GitHub Integration(Project Settings → Integrations)経由でのマイグレーション自動デプロイ
