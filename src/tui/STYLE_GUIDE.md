# TUIスタイルガイド

## 目的
TUIダッシュボードの一貫した視覚体験を提供するためのスタイル規則

## 色のセマンティクス

| 用途 | Inkカラー | 例 |
|------|-----------|-----|
| **デフォルト** | (指定なし) | 通常テキスト |
| **ユーザー入力/選択** | cyan | `Press Enter to continue` |
| **成功/完了** | green | `✓ Task completed` |
| **エラー/失敗** | red | `✗ Build failed` |
| **警告/注意** | yellow | `⚠ Warning` |
| **情報** | blue | `ℹ Info` |
| **エージェント/進行中** | magenta | `Thinking...` |
| **二次情報** | dim (gray) | `Additional info` |

## コンポーネントごとのスタイル

### ヘッダー
```
<bold>タイトル</bold> <dim>| サブタイトル</dim>
```

### ステータス表示
```
成功: <green>✓ done</green>
失敗: <red>✗ fail</red>
進行中: <yellow>◐ busy</yellow>
待機中: <cyan>○ wait</cyan>
```

### プログレスバー
```
[██████░░░░] 60%
```

### システムモニター
```
CPU: <magenta>0%</magenta>
Memory: <blue>0%</blue>
```

## 禁止事項

- ❌ `black` / `white`: ターミナルテーマに任せる
- ❌ カスタムRGBカラー: テーマ互換性の問題
- ❌ 過剰な装飾: 視認性の低下

## 推奨事項

- ✅ ANSI標準色のみ使用
- ✅ 意味のある色選択
- ✅ 一貫したフォーマット
- ✅ `dim` を使用して二次情報を表示
