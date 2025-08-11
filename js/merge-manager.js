// データマージ管理機能

class MergeManager {
    constructor() {
        // ページ単位の変更履歴
        this.changeHistory = new Map();
        // 元データのスナップショット（競合検出用）
        this.originalSnapshot = new Map();
    }

    // 初期データ読み込み時に呼び出し
    initializeFromData(tasks) {
        this.changeHistory.clear();
        this.originalSnapshot.clear();
        
        tasks.forEach(task => {
            this.originalSnapshot.set(task.id, {
                status: task.status,
                stage: task.stage,
                assignee: task.assignee,
                updated: task.updated
            });
        });
        
    }

    // タスク変更時に呼び出し
    recordChange(taskId, field, oldValue, newValue) {
        if (!this.changeHistory.has(taskId)) {
            this.changeHistory.set(taskId, {
                changes: {},
                timestamp: Date.now()
            });
        }
        
        const record = this.changeHistory.get(taskId);
        record.changes[field] = {
            original: oldValue,
            current: newValue,
            timestamp: Date.now()
        };
        
    }

    // 新データとのマージ処理
    mergeWithNewData(newTasks) {
        
        if (this.changeHistory.size === 0) {
            // 変更がない場合はそのまま新データを使用
            this.initializeFromData(newTasks);
            return { tasks: newTasks, conflicts: [] };
        }

        const conflicts = [];
        const mergedTasks = [...newTasks];
        
        // 変更があったタスクをチェック・マージ
        this.changeHistory.forEach((changeRecord, taskId) => {
            const newTask = mergedTasks.find(task => task.id === taskId);
            const originalData = this.originalSnapshot.get(taskId);
            
            if (!newTask) {
                // 新データにタスクが存在しない（削除された？）
                console.warn(`MergeManager: タスク ${taskId} が新データに存在しません`);
                return;
            }
            
            if (!originalData) {
                console.warn(`MergeManager: タスク ${taskId} の元データが見つかりません`);
                return;
            }

            // 競合チェック
            const conflictFields = this.detectConflicts(newTask, originalData, changeRecord);
            
            if (conflictFields.length > 0) {
                conflicts.push({
                    taskId: taskId,
                    taskTitle: newTask.title,
                    conflictFields: conflictFields,
                    localChanges: changeRecord.changes
                });
            }
            
            // ローカル変更を新データに適用
            this.applyChangesToTask(newTask, changeRecord.changes);
        });

        // 元データスナップショットのみ更新（変更履歴は保持）
        mergedTasks.forEach(task => {
            this.originalSnapshot.set(task.id, {
                status: task.status,
                stage: task.stage,
                assignee: task.assignee,
                updated: task.updated
            });
        });
        
        console.log(`MergeManager: マージ完了 - ${mergedTasks.length}件のタスク、${conflicts.length}件の競合、変更履歴保持: ${this.changeHistory.size}件`);
        
        return { tasks: mergedTasks, conflicts: conflicts };
    }

    // 競合検出
    detectConflicts(newTask, originalData, changeRecord) {
        const conflicts = [];
        
        Object.keys(changeRecord.changes).forEach(field => {
            const originalValue = originalData[field];
            const newValue = newTask[field];
            const localChange = changeRecord.changes[field];
            
            // 元データと新データが異なり、かつローカル変更の元値と一致する場合は競合
            if (originalValue !== newValue && localChange.original === originalValue) {
                conflicts.push({
                    field: field,
                    originalValue: originalValue,
                    serverValue: newValue,
                    localValue: localChange.current
                });
            }
        });
        
        return conflicts;
    }

    // ローカル変更を新タスクに適用
    applyChangesToTask(task, changes) {
        Object.keys(changes).forEach(field => {
            const change = changes[field];
            task[field] = change.current;
            task.updated = Math.floor(Date.now() / 1000); // タイムスタンプ更新
        });
    }

    // 変更履歴のクリア
    clearChangeHistory() {
        this.changeHistory.clear();
        this.originalSnapshot.clear();
        console.log('MergeManager: 変更履歴をクリア');
    }

    // 変更されたタスクIDのセットを取得（既存のmodifiedTaskIdsとの互換性）
    getModifiedTaskIds() {
        return new Set(this.changeHistory.keys());
    }

    // 変更統計
    getChangeStats() {
        const totalChanges = Array.from(this.changeHistory.values())
            .reduce((sum, record) => sum + Object.keys(record.changes).length, 0);
        
        return {
            modifiedTasks: this.changeHistory.size,
            totalChanges: totalChanges
        };
    }

    // 競合解決後の処理
    resolveConflicts(conflicts, resolution = 'local') {
        // この実装では常にローカル優先（ツール側優先）
        console.log(`MergeManager: ${conflicts.length}件の競合をローカル優先で解決`);
        return true;
    }

    // デバッグ用：現在の状態を表示
    debugPrint() {
        console.log('=== MergeManager Debug Info ===');
        console.log(`変更履歴: ${this.changeHistory.size}件`);
        console.log(`元データ: ${this.originalSnapshot.size}件`);
        
        if (this.changeHistory.size > 0) {
            console.log('変更詳細:');
            this.changeHistory.forEach((record, taskId) => {
                console.log(`  ${taskId}:`, record.changes);
            });
        }
    }
}

// グローバルインスタンス
const mergeManager = new MergeManager();