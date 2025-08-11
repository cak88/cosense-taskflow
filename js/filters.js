// フィルタリング・検索機能

function populateFilters(tasks) {
    const stemNames = new Set(tasks.map(t => t.stem).filter(Boolean));
    
    const populateSelect = (selectEl, dataSet, prefix = '', isAssignee = false) => {
        selectEl.innerHTML = '<option value="all">すべて</option>';
        [...dataSet].sort().forEach(item => {
            const option = document.createElement('option');
            option.value = item;
            if (isAssignee && item === 'Assigned to ') {
                option.textContent = '未割り当て';
            } else {
                option.textContent = item.replace(prefix, '');
            }
            selectEl.appendChild(option);
        });
    }

    // プロジェクト未設定のオプションを追加
    const populateStemSelect = (selectEl, dataSet) => {
        selectEl.innerHTML = '<option value="all">すべて</option>';
        selectEl.innerHTML += '<option value="no-project">プロジェクト未設定</option>';
        [...dataSet].sort().forEach(item => {
            const option = document.createElement('option');
            option.value = item;
            option.textContent = item;
            selectEl.appendChild(option);
        });
    }
    
    populateStemSelect(filterStem, stemNames);
    populateSelect(filterStatus, allStatuses, 'Status_');
    populateSelect(filterStage, allStages, 'Stage_');
    populateSelect(filterAssignee, allAssignees, 'Assigned to ', true);
    
    // ステージのデフォルトを「すべて」に設定
    filterStage.value = 'all';
}

function renderTasks() {
    taskBoard.innerHTML = '';
    let filteredTasks = [...allTasks];
    
    // ステータスフィルタがcompletedの場合は、完了済みチェックボックスを無視
    if (!showCompleted.checked && filterStatus.value !== 'Status_completed') {
        filteredTasks = filteredTasks.filter(t => t.status !== 'Status_completed');
    }
    
    // ステージフィルタがinactiveの場合は、inactiveチェックボックスを無視
    if (!showInactive.checked && filterStage.value !== 'Stage_inactive') {
        filteredTasks = filteredTasks.filter(t => t.stage !== 'Stage_inactive');
    }
    if (!showBeforeStart.checked) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        filteredTasks = filteredTasks.filter(t => {
            if (!t.startDate) return true; // 開始日が設定されていない場合は表示
            const startDate = new Date(t.startDate);
            startDate.setHours(0, 0, 0, 0);
            return startDate <= today; // 開始日が今日以前なら表示
        });
    }
    if (filterStatus.value !== 'all') filteredTasks = filteredTasks.filter(t => t.status === filterStatus.value);
    if (filterStage.value !== 'all') filteredTasks = filteredTasks.filter(t => t.stage === filterStage.value);
    if (filterStem.value === 'no-project') {
        filteredTasks = filteredTasks.filter(t => !t.stem || t.stem === null);
    } else if (filterStem.value !== 'all') {
        filteredTasks = filteredTasks.filter(t => t.stem === filterStem.value);
    }
    if (filterAssignee.value !== 'all') filteredTasks = filteredTasks.filter(t => t.assignedTo === filterAssignee.value);
    
    filteredTasks.sort((a, b) => {
        switch (sortBy.value) {
            case 'smart': 
                // 1. 期限日での比較（期限日なしは最下位）
                const aDate = a.dueDate ? new Date(a.dueDate) : null;
                const bDate = b.dueDate ? new Date(b.dueDate) : null;
                
                // 無効な日付をnullに変換
                const aValidDate = aDate && !isNaN(aDate.getTime()) ? aDate : null;
                const bValidDate = bDate && !isNaN(bDate.getTime()) ? bDate : null;
                
                if (aValidDate && bValidDate) {
                    const dateDiff = aValidDate - bValidDate;
                    if (dateDiff !== 0) return dateDiff;
                } else if (aValidDate && !bValidDate) {
                    return -1; // aに期限日あり → 優先
                } else if (!aValidDate && bValidDate) {
                    return 1;  // bに期限日あり → 優先
                }
                
                // 2. 重要度・緊急度での比較（ハッシュタグまたは[]リンク形式）
                const checkHighPriority = (task) => {
                    const content = originalJson.pages.find(p => p.id === task.id)?.lines.join('\n') || '';
                    return content.includes('#Importance_high') || 
                           content.includes('[Importance_high]') ||
                           content.includes('#Urgency_high') ||
                           content.includes('[Urgency_high]');
                };
                const aIsHigh = checkHighPriority(a);
                const bIsHigh = checkHighPriority(b);
                
                if (aIsHigh && !bIsHigh) return -1;
                if (!aIsHigh && bIsHigh) return 1;
                
                // 3. ステータスでの比較
                const statusPriority = {
                    'Status_inProgress': 1,
                    'Status_waiting': 2,
                    'Status_review': 3,
                    'Status_notStarted': 4,
                    'Status_completed': 5
                };
                
                const aStatusPriority = statusPriority[a.status] || 999;
                const bStatusPriority = statusPriority[b.status] || 999;
                
                if (aStatusPriority !== bStatusPriority) {
                    return aStatusPriority - bStatusPriority;
                }
                
                // 4. 最終的なフォールバック：更新日順（新しい順）
                return b.updated - a.updated;
                
            case 'updated-desc': return b.updated - a.updated;
            case 'updated-asc': return a.updated - b.updated;
            case 'due-date-asc': return (new Date(a.dueDate) || Infinity) - (new Date(b.dueDate) || Infinity);
            case 'due-date-desc': return (new Date(b.dueDate) || Infinity) - (new Date(a.dueDate) || Infinity);
            case 'title-asc': return a.title.localeCompare(b.title, 'ja');
            default: return 0;
        }
    });

    if (filteredTasks.length === 0) {
         taskBoard.innerHTML = `<div class="text-center py-16 text-gray-500"><p>条件に一致するタスクはありません。</p></div>`;
         return;
    }
    
    filteredTasks.forEach(task => taskBoard.appendChild(createTaskCard(task)));
}