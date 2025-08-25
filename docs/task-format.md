# タスク形式の詳細

## タスクページの認識

- 指定のアイコン（デフォルトは`[leaves.icon]`）を含むページをタスクとして認識し一覧表示
  - ただし、除外タグ（デフォルトは`#Exclude`または`[Exclude]`）があるページは除外します

## タスク情報

タスクの情報は、以下のような情報をページ内に記載することで設定できます：

```
タスクタイトル
[leaves.icon]
[stem.icon][プロジェクト名] [Assigned to 担当者]
[Status_inProgress] [Stage_active]
開始日 [2025-01-01] 期限日 [2025-01-15]
[Context_work] [Importance_high] [Urgency_normal]

タスクの説明がここに入ります...
```

## ステータス

タスクの現在の進行状況を示します

**デフォルトオプション**
- `Status_notStarted` - 未着手
- `Status_inProgress` - 進行中
- `Status_waiting` - 待機中（外部要因）
- `Status_review` - レビュー中（人間レビュー待ちなど）
- `Status_completed` - 完了（デフォルトで非表示）

## ステージ

タスクがどのような状態にあるのかを示します

**デフォルトオプション**
- `Stage_active` - アクティブ（inbox）
- `Stage_inactive` - 非アクティブ（デフォルトで非表示）
- `Stage_someday` - いつかやる 💛
- `Stage_temp` - 仮登録状態 🩶

## 担当者

タスクの担当者を示します

**デフォルトオプション**
- `Assigned to human` - 人間にアサイン
- `Assigned to ai` - AIにアサイン

## 開始日、期限日

例:`開始日 [2025-01-01] 期限日 [2025-01-15]`  
開始日と期限日を設定可能です
- 開始日前のタスクはデフォルトで非表示

## 重要度・緊急度

重要度もしくは緊急度が高いものはハイライト表示されます
- `[Importance_high]`: 重要度高
- `[Urgency_high]`: 緊急度高

## プロジェクト

`[stem.icon][プロジェクト名]`でプロジェクトを指定可能です

## 親タスク

`from [親タスク]`で親タスクを指定可能です