// UI生成・レンダリング

function getProjectDisplayText(task) {
    const stem = task.stem;
    const parentTask = task.parentTask;
    
    const createScrapboxLink = (text) => {
        const url = settingsManager.getScrapboxUrl(text);
        return `<a href="${url}" target="_blank" class="text-blue-400 hover:text-blue-300 hover:underline transition-colors">${text}</a>`;
    };
    
    if (stem && parentTask && stem !== parentTask) {
        return `プロジェクト: ${createScrapboxLink(stem)}&nbsp;&nbsp;親: ${createScrapboxLink(parentTask)}`;
    } else if (stem) {
        return `プロジェクト: ${createScrapboxLink(stem)}`;
    } else if (parentTask) {
        return `親タスク: ${createScrapboxLink(parentTask)}`;
    }
    return '';
}

function createTaskCard(task) {
    const card = document.createElement('div');
    
    // 重要度・緊急度チェック（ハッシュタグまたは[]リンク形式）
    const checkHighPriority = (task) => {
        const content = originalJson.pages.find(p => p.id === task.id)?.lines.join('\n') || '';
        return content.includes('#Importance_high') || 
               content.includes('[Importance_high]') ||
               content.includes('#Urgency_high') ||
               content.includes('[Urgency_high]');
    };
    const isImportant = checkHighPriority(task);
    
    card.className = `task-card bg-gray-800 rounded-lg p-4 flex flex-row items-center shadow-lg border border-gray-700 ${isImportant ? 'is-important' : ''} hover:bg-gray-750 transition-colors`;
    card.dataset.taskId = task.id;

    const startDateInfo = getDateInfo(task.startDate, 'start');
    const dueDateInfo = getDateInfo(task.dueDate, 'due');

    const createSelect = (options, selectedValue, prefix, field) => {
        
        const currentStatusColor = getStatusColor(task.status);
        const currentStageColor = getStageColor(task.stage);
        const isStatus = field === 'status';
        const isStage = field === 'stage';
        const className = `editable-select ${isStatus ? 'status-select ' + currentStatusColor.bg + ' ' + currentStatusColor.text : isStage ? 'status-select ' + currentStageColor.bg + ' ' + currentStageColor.text : 'assignee-select'}`;
        
        const noneValue = prefix;
        const noneText = isStatus ? '---' : isStage ? '---' : '未割り当て';
        const isNoneSelected = !selectedValue || selectedValue === noneValue;
        
        let optionsHtml = `<option value="${noneValue}"${isNoneSelected ? ' selected' : ''}>${noneText}</option>`;
        
        [...options].sort().forEach(opt => {
            if (opt === noneValue) return;
            const isSelected = opt === selectedValue;
            const displayText = opt.replace(prefix, '');
            optionsHtml += `<option value="${opt}"${isSelected ? ' selected' : ''}>${displayText}</option>`;
        });
        
        return `<select class="${className}" onchange="updateTask('${task.id}', '${field}', this.value)">${optionsHtml}</select>`;
    };

    const scrapboxUrl = settingsManager.getScrapboxUrl(task.title);
    const displayTitle = task.title.length > 80 ? task.title.substring(0, 80) + '...' : task.title;
    
    // 統一されたレスポンシブテンプレート
    card.innerHTML = `
        <!-- タイトル領域 -->
        <div class="flex-1 min-w-0 pr-6 w-full">
            <a href="${scrapboxUrl}" target="_blank" 
               class="text-lg font-bold text-blue-400 hover:text-blue-300 no-underline hover:underline transition-colors block"
               title="${task.title}">
                ${displayTitle}
            </a>
            ${task.stem || task.parentTask ? `<p class="text-sm text-blue-400 font-medium mt-1">${getProjectDisplayText(task)}</p>` : ''}
        </div>
        
        <!-- 小画面表示専用 (512px未満): コンパクトな1行表示 -->
        <div class="mobile-small-only flex items-center text-xs gap-1.5 w-full mb-3 overflow-x-auto">
            <!-- 担当者 -->
            <div class="flex items-center flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 mr-0.5 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" /></svg>
                <div class="text-xs w-12 truncate">
                    ${createSelect(allAssignees, task.assignedTo, 'Assigned to ', 'assignedTo')}
                </div>
            </div>
            
            <!-- 期限日 -->
            <div class="flex items-center ${dueDateInfo.color} flex-shrink-0 w-20">
                ${task.dueDate ? `
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 mr-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <span class="text-xs whitespace-nowrap">${task.dueDate}</span>
                ` : ''}
            </div>
            
            <!-- ステータス -->
            <div class="flex-shrink-0 w-18">
                ${createSelect(allStatuses, task.status, 'Status_', 'status')}
            </div>
            
            <!-- ステージ（CSS円形・サイクリング） -->
            <div class="flex-shrink-0 w-4 flex justify-center" title="${task.stage?.replace('Stage_', '') || 'Unknown'}">
                <div class="stage-circle ${getStageCircleClass(task.stage)}" 
                     onclick="updateTask('${task.id}', 'stage', cycleStage('${task.stage}', allStages));"></div>
            </div>
            
            <!-- 更新日 -->
            <div class="text-gray-500 text-xs flex-shrink-0 ml-auto whitespace-nowrap">
                ${new Date(task.updated * 1000).toISOString().split('T')[0]}
            </div>
        </div>
        
        <!-- 中画面表示専用 (512px-1024px): 開始日も含む表示 -->
        <div class="mobile-medium-only flex items-center text-xs gap-2 w-full mt-2 mb-2 overflow-x-auto">
            <!-- 担当者 -->
            <div class="flex items-center flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 mr-0.5 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" /></svg>
                <div class="text-xs w-16 truncate">
                    ${createSelect(allAssignees, task.assignedTo, 'Assigned to ', 'assignedTo')}
                </div>
            </div>
            
            <!-- 開始日 -->
            <div class="flex items-center ${startDateInfo.color} flex-shrink-0 w-20">
                ${task.startDate ? `
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 mr-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    <span class="text-xs whitespace-nowrap">${task.startDate}</span>
                ` : ''}
            </div>
            
            <!-- 期限日 -->
            <div class="flex items-center ${dueDateInfo.color} flex-shrink-0 w-20">
                ${task.dueDate ? `
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 mr-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <span class="text-xs whitespace-nowrap">${task.dueDate}</span>
                ` : ''}
            </div>
            
            <!-- ステータス -->
            <div class="flex-shrink-0 w-20">
                ${createSelect(allStatuses, task.status, 'Status_', 'status')}
            </div>
            
            <!-- ステージ（CSS円形・サイクリング） -->
            <div class="flex-shrink-0 w-4 flex justify-center" title="${task.stage?.replace('Stage_', '') || 'Unknown'}">
                <div class="stage-circle ${getStageCircleClass(task.stage)}" 
                     onclick="updateTask('${task.id}', 'stage', cycleStage('${task.stage}', allStages));"></div>
            </div>
            
            <!-- 更新日 -->
            <div class="text-gray-500 text-xs flex-shrink-0 ml-auto whitespace-nowrap">
                ${new Date(task.updated * 1000).toISOString().split('T')[0]}
            </div>
        </div>
        
        <!-- デスクトップ表示専用: 担当者 -->
        <div class="desktop-only flex items-center w-36 px-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1.5 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" /></svg>
            <div class="flex-1 min-w-0">
                ${createSelect(allAssignees, task.assignedTo, 'Assigned to ', 'assignedTo')}
            </div>
        </div>
        
        <!-- デスクトップ表示専用: 日付情報 -->
        <div class="desktop-only flex flex-col text-xs text-gray-400 w-24 ${task.startDate && task.dueDate ? 'space-y-1' : 'justify-center'}">
            ${task.startDate ? `
                <div class="flex items-center ${startDateInfo.color}">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    <span class="whitespace-nowrap text-xs">${task.startDate}</span>
                </div>` : (task.dueDate ? '' : '')
            }
            ${task.dueDate ? `
                <div class="flex items-center ${dueDateInfo.color}">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <span class="whitespace-nowrap text-xs">${task.dueDate}</span>
                </div>` : ''
            }
        </div>
        
        <!-- デスクトップ表示専用: ステータス -->
        <div class="desktop-only w-24 text-center ml-6">
            ${createSelect(allStatuses, task.status, 'Status_', 'status')}
        </div>
        
        <!-- デスクトップ表示専用: ステージ（CSS円形・サイクリング） -->
        <div class="desktop-only w-20 text-center ml-4">
            <div class="flex justify-center" title="${task.stage?.replace('Stage_', '') || 'Unknown'}">
                <div class="stage-circle ${getStageCircleClass(task.stage)}" 
                     onclick="updateTask('${task.id}', 'stage', cycleStage('${task.stage}', allStages));"></div>
            </div>
        </div>
        
        <!-- デスクトップ表示専用: 更新日 -->
        <div class="desktop-only text-xs text-gray-500 w-20 text-right">
            ${new Date(task.updated * 1000).toISOString().split('T')[0]}
        </div>
    `;
    return card;
}

// ヘルパー関数
const getStatusColor = (status) => ({
    'Status_completed': { bg: 'bg-green-800/50', text: 'text-green-300' },
    'Status_inProgress': { bg: 'bg-blue-800/50', text: 'text-blue-300' },
    'Status_waiting': { bg: 'bg-yellow-800/50', text: 'text-yellow-300' },
    'Status_review': { bg: 'bg-yellow-800/50', text: 'text-yellow-300' },
    'Status_notStarted': { bg: 'bg-gray-700', text: 'text-gray-300' },
}[status] || { bg: 'bg-purple-800/50', text: 'text-purple-300' });

const getStageColor = (stage) => ({
    'Stage_active': { bg: 'bg-blue-800/50', text: 'text-blue-300' },      // inProgressと同じ
    'Stage_someday': { bg: 'bg-yellow-800/50', text: 'text-yellow-300' }, // waitingと同じ
    'Stage_inactive': { bg: 'bg-gray-700', text: 'text-gray-300' },       // notStartedと同じ
    'Stage_temp': { bg: 'bg-gray-700', text: 'text-gray-300' },           // notStartedと同じ
}[stage] || { bg: 'bg-purple-800/50', text: 'text-purple-300' });

const getStageEmoji = (stage) => ({
    'Stage_active': '🟢',      // 緑丸 (アクティブ)
    'Stage_someday': '🟡',    // 黄丸 (いつか)
    'Stage_inactive': '⚫',   // 黒丸 (非アクティブ)
    'Stage_temp': '🔘',       // 白丸 (一時的)
}[stage] || '❓');

const getStageCircleClass = (stage) => ({
    'Stage_active': 'stage-active',
    'Stage_someday': 'stage-someday',
    'Stage_inactive': 'stage-inactive',
    'Stage_temp': 'stage-temp',
}[stage] || 'stage-unknown');

// ステージをサイクリングする関数
function cycleStage(currentStage, allStages) {
    const stageOrder = ['Stage_active', 'Stage_someday', 'Stage_inactive', 'Stage_temp'];
    const availableStages = stageOrder.filter(stage => allStages.has(stage));
    
    if (availableStages.length === 0) return currentStage;
    
    const currentIndex = availableStages.indexOf(currentStage);
    const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % availableStages.length;
    return availableStages[nextIndex];
}

function getDateInfo(dateStr, type) {
    if (!dateStr) return { text: '', color: '' };
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((date - today) / (1000 * 60 * 60 * 24));

    if (type === 'due') {
        if (diffDays < 0) return { text: `(${Math.abs(diffDays)}日前)`, color: 'text-red-400' };
        if (diffDays === 0) return { text: '(今日)', color: 'text-orange-400' };
        if (diffDays <= 7) return { text: `(あと${diffDays}日)`, color: 'text-yellow-400' };
    } else if (type === 'start') {
        if (diffDays > 0) return { text: `(あと${diffDays}日)`, color: 'text-cyan-400' };
        if (diffDays === 0) return { text: '(今日から)', color: 'text-green-400' };
    }
    return { text: '', color: 'text-gray-400' };
}