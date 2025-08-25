// エクスポート機能

function updateTask(taskId, field, value) {
    const task = allTasks.find(t => t.id === taskId);
    const originalTask = originalTasks.find(t => t.id === taskId);
    
    if (task && originalTask) {
        const oldValue = task[field];
        const newValue = (value === 'Status_' || value === 'Stage_' || value === 'Assigned to ') ? null : value;
        
        // MergeManager に変更を記録
        mergeManager.recordChange(taskId, field, oldValue, newValue);
        
        // modifiedTaskIdsをMergeManagerと同期
        modifiedTaskIds = mergeManager.getModifiedTaskIds();
        
        task[field] = newValue;
        task.updated = Math.floor(Date.now() / 1000);
        
        // 個別のタスクカードのみを更新
        updateSingleTaskCard(taskId);
        updateExportButton();
    }
}

// 単一のタスクカードのみを更新する関数
function updateSingleTaskCard(taskId) {
    const task = allTasks.find(t => t.id === taskId);
    if (!task) return;
    
    const existingCard = document.querySelector(`[data-task-id="${taskId}"]`);
    if (!existingCard) {
        // カードが見つからない場合は全体を再描画
        refreshTasks();
        return;
    }
    
    // 新しいカードを作成
    const newCard = createTaskCard(task);
    
    // 既存のカードを新しいカードで置き換え
    existingCard.parentNode.replaceChild(newCard, existingCard);
}

function updateExportButton() {
    const exportButton = document.getElementById('export-button');
    const exportSection = document.getElementById('export-section');
    const changesCount = mergeManager.getModifiedTaskIds().size;
    
    // エクスポートセクションは常に表示
    exportSection.classList.remove('hidden');
    
    // エクスポートボタンの状態を更新
    if (changesCount === 0) {
        exportButton.disabled = true;
        exportButton.textContent = '変更なし';
        exportButton.className = 'bg-gray-600 text-white font-bold py-2 px-4 rounded-md text-sm cursor-not-allowed';
    } else {
        exportButton.disabled = false;
        exportButton.textContent = `変更をエクスポート (${changesCount}件)`;
        exportButton.className = 'bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition-colors text-sm';
    }
}

async function exportJson() {
    if (!originalJson) { alert("エクスポートするデータがありません。"); return; }
    
    // エクスポート前データ取得の設定を確認
    const fetchBeforeExport = settingsManager.get('export', 'fetchBeforeExport');
    const openImportPage = settingsManager.get('export', 'openImportPage');
    
    // インポート画面をボタン押下時に即座に開く
    if (openImportPage) {
        const importUrl = settingsManager.getScrapboxImportUrl();
        window.open(importUrl, '_blank', 'noopener,noreferrer');
        showMessage('Scrapboxインポート画面を別ウィンドウで開きました', 'info');
    }
    
    // データ更新が有効な場合は更新を待ってからエクスポート
    if (fetchBeforeExport) {
        try {
            showMessage('最新データを取得してからエクスポートします...', 'info');
            await fetchFromScrapboxAPI(true); // エクスポート前は手動操作として実行
            showMessage('最新データを取得しました。エクスポートを開始します。', 'success');
        } catch (error) {
            const proceed = confirm(`データ取得に失敗しました: ${error.message}\n\n現在のデータでエクスポートを続行しますか？`);
            if (!proceed) return;
        }
    }
    
    // MergeManagerから変更されたタスクIDを取得
    const changedTaskIds = mergeManager.getModifiedTaskIds();
    if (changedTaskIds.size === 0) { alert("変更がありません。"); return; }
    
    const newJson = JSON.parse(JSON.stringify(originalJson));
    const taskMap = new Map(
        allTasks
            .filter(t => changedTaskIds.has(t.id))
            .map(t => [t.id, t])
    );
    
    // 変更されたページのみを含む新しいJSONを作成
    newJson.pages = newJson.pages.filter(page => changedTaskIds.has(page.id));

    newJson.pages.forEach(page => {
        if (taskMap.has(page.id)) {
            const updatedTask = taskMap.get(page.id);
            page.updated = updatedTask.updated;
            
            page.lines = page.lines.map(line => {
                let newLine = line;
                // Replace status
                const oldStatusRegex = /\[Status_[^\]]*\]/g;
                const newStatus = `[${updatedTask.status || 'Status_'}]`;
                if (line.match(oldStatusRegex)) {
                    newLine = newLine.replace(oldStatusRegex, newStatus);
                } else if (!page.lines.some(l => l.match(oldStatusRegex))) {
                    // If status doesn't exist anywhere, add it to the first line with task icon
                    const taskIconPattern = settingsManager.getTaskIconPattern();
                    if (newLine.includes(taskIconPattern)) {
                        newLine += ` ${newStatus}`;
                    }
                }

                // Replace stage
                const oldStageRegex = /\[Stage_[^\]]*\]/g;
                const newStage = `[${updatedTask.stage || 'Stage_'}]`;
                if (line.match(oldStageRegex)) {
                    newLine = newLine.replace(oldStageRegex, newStage);
                } else if (!page.lines.some(l => l.match(oldStageRegex))) {
                    // If stage doesn't exist anywhere, add it to the first line with status
                     if (newLine.includes('[Status_')) {
                        newLine += ` ${newStage}`;
                    }
                }

                // Replace assignee
                const oldAssigneeRegex = /\[Assigned to [^\]]*\]|Assigned to \[[^\]]*\]/g;
                const newAssignee = `[${updatedTask.assignedTo || 'Assigned to '}]`;
                 if (line.match(oldAssigneeRegex)) {
                    newLine = newLine.replace(oldAssigneeRegex, newAssignee);
                } else if (!page.lines.some(l => l.match(oldAssigneeRegex))) {
                     if (newLine.includes('[stem.icon]')) {
                        newLine += ` ${newAssignee}`;
                    }
                }
                return newLine.trim();
            });
        }
    });

    const blob = new Blob([JSON.stringify(newJson)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const filename = settingsManager.generateExportFilename();
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    // エクスポート成功後にoriginalJsonを更新（変更を確定）
    updateOriginalJsonAfterExport(changedTaskIds, taskMap);
    
    // エクスポート後もIDリストは保持（累積変更のため）
    // modifiedTaskIds.clear(); // コメントアウト
    updateExportButton();
    
    showMessage(`エクスポートが完了しました: ${filename}`, 'success');
}