// データ処理・パース関連

function handleFile(file) {
    if (file && file.type === 'application/json') {
        fileInfo.textContent = `読み込み中: ${file.name}`;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                originalJson = data;
                processCosenseData(data);
            } catch (error) {
                console.error('JSON parse error:', error);
                alert('JSONファイルのパースに失敗しました。');
            }
        };
        reader.readAsText(file);
    } else {
        alert('JSONファイルを選択してください。');
    }
}

function processCosenseData(data) {
    if (!data.pages) { console.error("Data missing 'pages' array."); return; }

    // バックアップIDを更新（追跡用）
    const newBackupId = data.backupId;
    if (newBackupId) {
        currentBackupId = newBackupId;
        console.log(`ScrapboxAPI: バックアップID ${newBackupId} でマージ処理を実行`);
    }

    // 設定から定義済みのタグリストを取得（"undefined"文字列もチェック）
    const rawStatusTags = settingsManager.get('taskRecognition', 'statusTags');
    const rawStageTags = settingsManager.get('taskRecognition', 'stageTags');
    const rawAssigneeTags = settingsManager.get('taskRecognition', 'assigneeTags');
    
    const statusTagsStr = (rawStatusTags && rawStatusTags !== 'undefined') ? rawStatusTags : DEFAULT_CONFIG.taskRecognition.statusTags;
    const stageTagsStr = (rawStageTags && rawStageTags !== 'undefined') ? rawStageTags : DEFAULT_CONFIG.taskRecognition.stageTags;  
    const assigneeTagsStr = (rawAssigneeTags && rawAssigneeTags !== 'undefined') ? rawAssigneeTags : DEFAULT_CONFIG.taskRecognition.assigneeTags;
    
    // カンマ区切りの文字列をSetに変換
    allStatuses = new Set(statusTagsStr.split(',').map(s => s.trim()).filter(s => s));
    allStages = new Set(stageTagsStr.split(',').map(s => s.trim()).filter(s => s));
    allAssignees = new Set(assigneeTagsStr.split(',').map(s => s.trim()).filter(s => s));
    
    // 除外ページチェック関数（設定ベース）
    const getExcludeTags = () => {
        const rawExcludeTags = settingsManager.get('taskRecognition', 'excludeTags');
        const excludeTagsStr = (rawExcludeTags && rawExcludeTags !== 'undefined') ? rawExcludeTags : DEFAULT_CONFIG.taskRecognition.excludeTags;
        return excludeTagsStr.split(',').map(tag => tag.trim()).filter(tag => tag);
    };
    
    const isExcludedPage = (page) => {
        const content = page.lines.join('\n');
        const excludeTags = getExcludeTags();
        
        // 設定された除外タグのいずれかが含まれている場合は除外
        return excludeTags.some(tag => content.includes(`#${tag}`) || content.includes(`[${tag}]`));
    };

    // 設定からタスク認識パターンを取得
    const taskIconPattern = settingsManager.getTaskIconPattern();
    
    const newTasks = data.pages
        .filter(page => page.lines.some(line => line.includes(taskIconPattern)))
        .filter(page => !isExcludedPage(page))  // 除外ページを除く
        .map(page => parseTask(page));
    
    // マージ処理：既存の変更を新データに統合
    const mergeResult = mergeManager.mergeWithNewData(newTasks);
    allTasks = mergeResult.tasks;
    
    // 競合がある場合のアラート表示
    if (mergeResult.conflicts.length > 0) {
        showConflictAlert(mergeResult.conflicts);
    }
    
    // 元のタスクデータを保存（ディープコピー）
    originalTasks = JSON.parse(JSON.stringify(allTasks));
    
    // 既存のmodifiedTaskIdsをMergeManagerの変更履歴と同期
    modifiedTaskIds = mergeManager.getModifiedTaskIds();
    
    populateFilters(allTasks);
    controlsSection.classList.remove('hidden');
    controls.classList.add('hidden');
    controlsChevron.style.transform = 'rotate(-90deg)';
    exportSection.classList.remove('hidden');
    toggleUpload.classList.remove('hidden');
    dropZone.classList.add('hidden');
    uploadChevron.style.transform = 'rotate(-90deg)';
    placeholder.classList.add('hidden');
    renderTasks();
    updateExportButton();
}

function parseTask(page) {
    const content = page.lines.join('\n');
    const getVal = (regex) => (content.match(regex) || [])[1]?.trim() || null;
    const getAllVals = (regex) => [...content.matchAll(regex)].map(match => match[1].trim());

    // Improved regex to capture values regardless of their position in the line
    const assignedTo = getVal(/\[(Assigned to .*?)\]/) || getVal(/Assigned to \[(.*?)\]/);

    return {
        id: page.id,
        title: page.title,
        updated: page.updated,
        stem: getVal(/\[stem\.icon\]\[(.*?)\]/),
        parentTask: getVal(/from \[(.*?)\]/),
        status: getVal(/\[(Status_[^\]]*)\]/),
        stage: getVal(/\[(Stage_[^\]]*)\]/),
        assignedTo: assignedTo,
        startDate: getVal(/Start Date \[(.*?)\]/),
        dueDate: getVal(/Due Date \[(.*?)\]/),
        tags: getAllVals(/#([^\s,\[\]]+)/g),
    };
}