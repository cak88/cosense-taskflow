// メイン処理・初期化

// --- DOM Elements ---
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const fileInfo = document.getElementById('file-info');
const taskBoard = document.getElementById('task-board');
const controls = document.getElementById('controls');
const controlsSection = document.getElementById('controls-section');
const exportSection = document.getElementById('export-section');
const toggleUpload = document.getElementById('toggle-upload');
const toggleControls = document.getElementById('toggle-controls');
const uploadChevron = document.getElementById('upload-chevron');
const controlsChevron = document.getElementById('controls-chevron');
const placeholder = document.getElementById('placeholder');
const sortBy = document.getElementById('sort-by');
const filterStatus = document.getElementById('filter-status');
const filterStage = document.getElementById('filter-stage');
const filterStem = document.getElementById('filter-stem');
const filterAssignee = document.getElementById('filter-assignee');
const showCompleted = document.getElementById('show-completed');
const showBeforeStart = document.getElementById('show-before-start');
const showInactive = document.getElementById('show-inactive');
const exportButton = document.getElementById('export-button');

// 設定関連のDOM要素
const helpButton = document.getElementById('help-button');
const fileUploadButton = document.getElementById('file-upload-button');
const settingsButton = document.getElementById('settings-button');
const settingsModal = document.getElementById('settings-modal');
const settingsClose = document.getElementById('settings-close');
const settingsSave = document.getElementById('settings-save');
const settingsCancel = document.getElementById('settings-cancel');
const settingsReset = document.getElementById('settings-reset');
const settingProjectName = document.getElementById('setting-project-name');
const settingTaskIcon = document.getElementById('setting-task-icon');
const settingBookmarkUrl = document.getElementById('setting-bookmark-url');
const settingAutoFetch = document.getElementById('setting-auto-fetch');
const settingInitialFetch = document.getElementById('setting-initial-fetch');
const settingFetchInterval = document.getElementById('setting-fetch-interval');
const settingAuthToken = document.getElementById('setting-auth-token');
const testConnectionButton = document.getElementById('test-connection');
const connectionStatus = document.getElementById('connection-status');
const clearBackupCacheButton = document.getElementById('clear-backup-cache');
const settingFilenameFormat = document.getElementById('setting-filename-format');
const settingExportFolder = document.getElementById('setting-export-folder');
const settingFetchBeforeExport = document.getElementById('setting-fetch-before-export');
const settingOpenImportPage = document.getElementById('setting-open-import-page');

// タスク認識設定関連の要素
const settingStatusTags = document.getElementById('setting-status-tags');
const settingStagesTags = document.getElementById('setting-stage-tags');
const settingAssigneeTags = document.getElementById('setting-assignee-tags');
const settingExcludeTags = document.getElementById('setting-exclude-tags');

// 使い方モーダル関連の要素
const helpModal = document.getElementById('help-modal');
const helpClose = document.getElementById('help-close');
const helpOk = document.getElementById('help-ok');

// --- State ---
let originalJson = null;
let allTasks = [];
let originalTasks = []; // 元のタスクデータ
let modifiedTaskIds = new Set(); // 変更されたタスクID
let currentBackupId = null; // 現在のバックアップID
let allStatuses = new Set();
let allStages = new Set();
let allAssignees = new Set();

// --- Event Listeners ---
// dropZone関連のイベントリスナーは要素が存在する場合のみ設定
if (dropZone && fileInput) {
    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('border-blue-500', 'bg-gray-700'); });
    dropZone.addEventListener('dragleave', () => { dropZone.classList.remove('border-blue-500', 'bg-gray-700'); });
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-blue-500', 'bg-gray-700');
        const files = e.dataTransfer.files;
        if (files.length > 0) { fileInput.files = files; handleFile(files[0]); }
    });
}
if (fileInput) {
    fileInput.addEventListener('change', (e) => { if (e.target.files.length > 0) { handleFile(e.target.files[0]); } });
}

// フィルター要素のイベントリスナーは存在する要素のみに設定
[sortBy, filterStatus, filterStage, filterStem, filterAssignee, showCompleted, showBeforeStart, showInactive]
    .filter(el => el) // null/undefinedを除外
    .forEach(el => el.addEventListener('change', renderTasks));
if (exportButton) {
    exportButton.addEventListener('click', () => {
        exportJson().catch(error => {
            console.error('エクスポートエラー:', error);
            alert(`エクスポートに失敗しました: ${error.message}`);
        });
    });
}

// 設定関連のイベントリスナー
helpButton?.addEventListener('click', openHelpModal);
fileUploadButton?.addEventListener('click', toggleFileUploadSection);
settingsButton?.addEventListener('click', openSettingsModal);
document.getElementById('bookmark-button')?.addEventListener('click', openBookmark);
settingsClose?.addEventListener('click', closeSettingsModal);
settingsCancel?.addEventListener('click', closeSettingsModal);
settingsSave?.addEventListener('click', saveSettings);
settingsReset?.addEventListener('click', resetSettings);
settingsModal?.addEventListener('click', (e) => {
    if (e.target === settingsModal) closeSettingsModal();
});
testConnectionButton?.addEventListener('click', testScrapboxConnection);
clearBackupCacheButton?.addEventListener('click', clearBackupCache);
helpClose?.addEventListener('click', closeHelpModal);
helpOk?.addEventListener('click', closeHelpModal);
helpModal?.addEventListener('click', (e) => {
    if (e.target === helpModal) closeHelpModal();
});

// 折りたたみ機能
toggleUpload?.addEventListener('click', () => toggleSection('upload'));
toggleControls?.addEventListener('click', () => toggleSection('controls'));


// ファイルアップロードセクションの表示/非表示
function toggleFileUploadSection() {
    const fileUploadSection = document.getElementById('file-upload-section');
    const isVisible = !fileUploadSection.classList.contains('hidden');
    
    if (isVisible) {
        // 非表示にする
        fileUploadSection.classList.add('hidden');
    } else {
        // 表示する
        fileUploadSection.classList.remove('hidden');
        // ドロップゾーンも表示する
        dropZone.classList.remove('hidden');
    }
}

// 折りたたみ機能
function toggleSection(section) {
    if (section === 'upload') {
        const isVisible = !dropZone.classList.contains('hidden');
        dropZone.classList.toggle('hidden', isVisible);
        uploadChevron.style.transform = isVisible ? 'rotate(-90deg)' : 'rotate(0deg)';
    } else if (section === 'controls') {
        const isVisible = !controls.classList.contains('hidden');
        controls.classList.toggle('hidden', isVisible);
        controlsChevron.style.transform = isVisible ? 'rotate(-90deg)' : 'rotate(0deg)';
    }
}

// 使い方モーダル関連の関数
function openHelpModal() {
    helpModal.classList.remove('hidden');
}

function closeHelpModal() {
    helpModal.classList.add('hidden');
}

// ブックマーク機能
function openBookmark() {
    const bookmarkUrl = settingsManager.get('general', 'bookmarkUrl');
    
    try {
        window.open(bookmarkUrl, '_blank', 'noopener,noreferrer');
    } catch (error) {
        console.error('ブックマーク開けませんでした:', error);
        showMessage('ブックマークを開けませんでした', 'error');
    }
}

// ブックマークボタンの表示/非表示を制御
function updateBookmarkButtonVisibility() {
    const bookmarkButton = document.getElementById('bookmark-button');
    const bookmarkUrl = settingsManager.get('general', 'bookmarkUrl');
    
    if (bookmarkButton) {
        if (bookmarkUrl && bookmarkUrl.trim() !== '') {
            bookmarkButton.style.display = '';
        } else {
            bookmarkButton.style.display = 'none';
        }
    }
}

// 設定モーダル関連の関数
function openSettingsModal() {
    loadSettingsToModal();
    settingsModal.classList.remove('hidden');
}

function closeSettingsModal() {
    settingsModal.classList.add('hidden');
}

function loadSettingsToModal() {
    settingProjectName.value = settingsManager.get('general', 'scrapboxProjectName');
    settingTaskIcon.value = settingsManager.get('general', 'taskIconName');
    settingBookmarkUrl.value = settingsManager.get('general', 'bookmarkUrl');
    settingAutoFetch.checked = settingsManager.get('api', 'enableAutoFetch');
    settingInitialFetch.checked = settingsManager.get('api', 'enableInitialFetch');
    settingFetchInterval.value = settingsManager.get('api', 'fetchInterval');
    settingAuthToken.value = settingsManager.get('api', 'authToken');
    settingFilenameFormat.value = settingsManager.get('export', 'filenameFormat');
    settingExportFolder.value = settingsManager.get('export', 'destinationFolder');
    settingFetchBeforeExport.checked = settingsManager.get('export', 'fetchBeforeExport');
    settingOpenImportPage.checked = settingsManager.get('export', 'openImportPage');
    
    // タスク認識設定
    const statusTags = settingsManager.get('taskRecognition', 'statusTags');
    const stageTags = settingsManager.get('taskRecognition', 'stageTags');
    const assigneeTags = settingsManager.get('taskRecognition', 'assigneeTags');
    const excludeTags = settingsManager.get('taskRecognition', 'excludeTags');
    
    // "undefined"文字列もundefinedとして扱う
    settingStatusTags.value = (statusTags && statusTags !== 'undefined') ? statusTags : DEFAULT_CONFIG.taskRecognition.statusTags;
    settingStagesTags.value = (stageTags && stageTags !== 'undefined') ? stageTags : DEFAULT_CONFIG.taskRecognition.stageTags;
    settingAssigneeTags.value = (assigneeTags && assigneeTags !== 'undefined') ? assigneeTags : DEFAULT_CONFIG.taskRecognition.assigneeTags;
    settingExcludeTags.value = (excludeTags && excludeTags !== 'undefined') ? excludeTags : DEFAULT_CONFIG.taskRecognition.excludeTags;
}

function saveSettings() {
    // プロジェクト名の変更をチェック
    const oldProjectName = settingsManager.get('general', 'scrapboxProjectName');
    const newProjectName = settingProjectName.value.trim() || 'your-project';
    
    const newSettings = {
        general: {
            scrapboxProjectName: newProjectName,
            taskIconName: settingTaskIcon.value.trim() || 'leaves',
            bookmarkUrl: settingBookmarkUrl.value.trim()
        },
        api: {
            enableAutoFetch: settingAutoFetch.checked,
            enableInitialFetch: settingInitialFetch.checked,
            fetchInterval: parseInt(settingFetchInterval.value) || 300,
            authToken: settingAuthToken.value.trim()
        },
        taskRecognition: {
            statusTags: settingStatusTags.value.trim(),
            stageTags: settingStagesTags.value.trim(),
            assigneeTags: settingAssigneeTags.value.trim(),
            excludeTags: settingExcludeTags.value.trim()
        },
        export: {
            filenameFormat: settingFilenameFormat.value,
            destinationFolder: settingExportFolder.value.trim(),
            fetchBeforeExport: settingFetchBeforeExport.checked,
            openImportPage: settingOpenImportPage.checked
        }
    };

    // 各カテゴリを保存
    Object.keys(newSettings).forEach(category => {
        settingsManager.setCategory(category, newSettings[category]);
    });

    // プロジェクト名が変更された場合、古いプロジェクトのキャッシュを削除
    if (oldProjectName !== newProjectName) {
        scrapboxAPI.clearProjectCache(oldProjectName);
        showMessage(`プロジェクトが変更されました。${oldProjectName}のキャッシュを削除しました。`, 'info');
    } else {
        alert('設定を保存しました');
    }
    closeSettingsModal();
    
    // 自動取得設定の変更に応じて開始/停止
    if (newSettings.api.enableAutoFetch) {
        startAutoFetch();
    } else {
        stopAutoFetch();
    }
    
    // 設定変更後にデータを再処理する場合
    if (allTasks.length > 0) {
        renderTasks();
    }
    
    // ブックマークボタンの表示を更新
    updateBookmarkButtonVisibility();
}

function resetSettings() {
    if (confirm('設定をリセットしますか？この操作は元に戻せません。')) {
        settingsManager.reset();
        loadSettingsToModal();
        updateBookmarkButtonVisibility();
        alert('設定をリセットしました');
    }
}

// 競合アラート表示
function showConflictAlert(conflicts) {
    const taskTitles = conflicts.map(c => c.taskTitle).join(', ');
    const message = `以下のタスクにコンフリクトが発生しました、変更を行ってもよろしいですか？\n\n${taskTitles}`;
    
    if (confirm(message)) {
        mergeManager.resolveConflicts(conflicts, 'local');
        showMessage('✅ 競合を解決し、ローカルの変更を優先しました', 'success');
    } else {
        showMessage('❌ マージがキャンセルされました', 'error');
    }
}

// メッセージ表示関数
function showMessage(message, type = 'info', persistent = false) {
    // 既存のメッセージを削除
    const existingMessage = document.querySelector('.toast-message');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    const toast = document.createElement('div');
    const baseClasses = 'toast-message fixed top-4 left-4 p-4 rounded-lg shadow-lg z-50 max-w-md transition-all duration-300';
    const typeClasses = type === 'success' ? 'bg-green-600 text-white' :
                       type === 'error' ? 'bg-red-600 text-white' :
                       type === 'loading' ? 'bg-orange-600 text-white' :
                       'bg-blue-600 text-white';
    
    toast.className = `${baseClasses} ${typeClasses}`;
    
    // ローディング表示の場合はアニメーション付きドットを追加
    if (type === 'loading') {
        toast.innerHTML = `
            <div class="flex items-center">
                <div class="loading-spinner mr-2">
                    <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                </div>
                <span>${message}</span>
            </div>
        `;
    } else {
        toast.textContent = message;
    }
    
    document.body.appendChild(toast);
    
    // 永続的でない場合は5秒後に自動削除
    if (!persistent) {
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 5000);
    }
}

// ローディングメッセージを非表示にする関数
function hideLoadingMessage() {
    const loadingMessage = document.querySelector('.toast-message');
    if (loadingMessage) {
        loadingMessage.remove();
    }
}

// 接続テスト機能
async function testScrapboxConnection() {
    const projectName = settingProjectName.value.trim() || 'your-project';
    const authToken = settingAuthToken.value.trim();
    
    connectionStatus.textContent = 'テスト中...';
    connectionStatus.className = 'text-sm text-yellow-400';
    testConnectionButton.disabled = true;
    testConnectionButton.textContent = 'テスト中...';
    
    try {
        scrapboxAPI.initialize(projectName, authToken);
        const result = await scrapboxAPI.testConnection();
        
        if (result.success) {
            connectionStatus.textContent = `✅ 接続成功 (${result.projectInfo.name || projectName})`;
            connectionStatus.className = 'text-sm text-green-400';
            showMessage('Scrapboxプロジェクトに正常に接続できました', 'success');
        } else {
            connectionStatus.textContent = `❌ 接続失敗: ${result.error}`;
            connectionStatus.className = 'text-sm text-red-400';
            showMessage(`接続に失敗しました: ${result.error}`, 'error');
        }
    } catch (error) {
        connectionStatus.textContent = `❌ エラー: ${error.message}`;
        connectionStatus.className = 'text-sm text-red-400';
        showMessage(`接続テストでエラーが発生しました: ${error.message}`, 'error');
    } finally {
        testConnectionButton.disabled = false;
        testConnectionButton.textContent = '接続テスト';
    }
}

// 手動キャッシュクリア機能
function clearBackupCache() {
    if (confirm('保存されたバックアップキャッシュをすべて削除しますか？\nこの操作は元に戻せません。')) {
        try {
            scrapboxAPI.clearAllCache();
            showMessage('キャッシュを削除しました', 'success');
        } catch (error) {
            showMessage(`キャッシュ削除でエラーが発生しました: ${error.message}`, 'error');
        }
    }
}

// 自動データ取得機能
let autoFetchInterval = null;

function startAutoFetch() {
    const enableAutoFetch = settingsManager.get('api', 'enableAutoFetch');
    const fetchInterval = settingsManager.get('api', 'fetchInterval') * 1000; // 秒をミリ秒に変換
    
    if (!enableAutoFetch) {
        console.log('自動データ取得は無効です');
        return;
    }
    
    console.log(`自動データ取得を開始: ${fetchInterval/1000}秒間隔`);
    
    // 既存のインターバルをクリア
    if (autoFetchInterval) {
        clearInterval(autoFetchInterval);
    }
    
    // 新しいインターバルを設定
    autoFetchInterval = setInterval(async () => {
        try {
            await fetchFromScrapboxAPI(false); // 自動取得（設定を考慮）
        } catch (error) {
            console.error('自動データ取得エラー:', error);
            showMessage(`自動データ取得でエラーが発生しました: ${error.message}`, 'error');
        }
    }, fetchInterval);
}

function stopAutoFetch() {
    if (autoFetchInterval) {
        clearInterval(autoFetchInterval);
        autoFetchInterval = null;
    }
}

// ScrapboxAPIからデータを取得し、処理する
async function fetchFromScrapboxAPI(isManualOperation = false) {
    const projectName = settingsManager.get('general', 'scrapboxProjectName');
    const authToken = settingsManager.get('api', 'authToken');
    
    
    // ローディング表示を開始
    showMessage('情報取得中...', 'loading', true);
    
    try {
        scrapboxAPI.initialize(projectName, authToken);
        
        // 手動操作でない場合（自動取得）は初回取得設定をチェック
        if (!isManualOperation && allTasks.length === 0 && !settingsManager.get('api', 'enableInitialFetch')) {
            hideLoadingMessage();
            showMessage('初回データ取得が無効です。設定で有効にするか手動で取得してください。', 'info');
            return;
        }
        
        // 2段階同期：バックアップ優先 + 個別ページ取得
        const hasNewBackup = await scrapboxAPI.hasNewBackup();
        
        if (hasNewBackup || allTasks.length === 0) {
            // 新しいバックアップがあれば取得してマージ（既存処理）
            const scrapboxData = await scrapboxAPI.getProjectData();
            const convertedData = scrapboxAPI.convertToVisualizerFormat(scrapboxData);
            
            originalJson = convertedData;
            processCosenseData(convertedData);
            
            showMessage(`新しいバックアップから ${scrapboxData.pages.length} 件を取得`, 'success');
        } else {
            // 新しいバックアップがなければ個別ページ取得してマージ（新機能）
            await fetchIndividualPagesAndMerge();
        }
        
        hideLoadingMessage();
        
    } catch (error) {
        console.error('ScrapboxAPI取得エラー:', error);
        hideLoadingMessage();
        showMessage(`データ取得に失敗しました: ${error.message}`, 'error');
        throw error;
    }
}


// 初期化
document.addEventListener('DOMContentLoaded', () => {
    // 初期状態でもエクスポートセクションとコントロールセクションを表示（要素が存在する場合のみ）
    if (exportSection) exportSection.classList.remove('hidden');
    if (controlsSection) controlsSection.classList.remove('hidden');
    
    // プレースホルダーを表示（データがない初期状態）
    if (placeholder) placeholder.classList.remove('hidden');
    
    updateExportButton();
    
    // ブックマークボタンの表示状態を初期化
    updateBookmarkButtonVisibility();
    
    // エクスポートエリアのAPI取得ボタンにイベントリスナーを追加
    document.getElementById('fetch-from-api')?.addEventListener('click', async (event) => {
        try {
            // 手動操作として実行（初回取得設定を無視）
            await fetchFromScrapboxAPI(true);
        } catch (error) {
            // エラーは既にfetchFromScrapboxAPI内で処理済み
        }
    });
    
    // 初回読み込み時にデータを取得（設定で有効な場合）
    if (settingsManager.get('api', 'enableInitialFetch')) {
        setTimeout(async () => {
            try {
                console.log('初回読み込み: データを取得します');
                await fetchFromScrapboxAPI(false); // 自動取得（設定を考慮）
            } catch (error) {
                console.log('初回データ取得に失敗しました:', error.message);
            }
        }, 1000);
    }
    
    // 設定が有効な場合は自動取得を開始
    if (settingsManager.get('api', 'enableAutoFetch')) {
        // 初期化後少し待ってから開始
        setTimeout(() => {
            startAutoFetch();
        }, 3000); // 初回取得後に開始するよう少し遅らせる
    }
});

// タスク作成ページとメインページの連携
window.addEventListener('message', (event) => {
    if (event.data.type === 'TASK_CREATED') {
        console.log('TaskCreator: 新しいタスクが作成されました');
        refreshTasksFromCache();
    }
});

// localStorage変更の監視（フォールバック）
window.addEventListener('storage', (event) => {
    if (event.key === 'taskflow_task_created') {
        console.log('TaskCreator: localStorage経由でタスク作成を検知');
        refreshTasksFromCache();
    }
});

// キャッシュからタスクを再読み込み
function refreshTasksFromCache() {
    try {
        // 最新のキャッシュデータを取得
        const latestCacheKey = scrapboxAPI.getLatestCacheKey();
        if (latestCacheKey) {
            const cacheData = JSON.parse(localStorage.getItem(latestCacheKey));
            if (cacheData && cacheData.data) {
                processCosenseData(cacheData.data);
                showMessage('新しいタスクが追加されました', 'success');
            }
        }
    } catch (error) {
        console.warn('キャッシュからのタスク更新エラー:', error);
    }
}

// 個別ページ取得・マージ機能（新規追加）
async function fetchIndividualPagesAndMerge() {
    // 1. 変更タスクのページタイトル一覧を取得
    const changedTaskTitles = getChangedTaskTitles();
    
    if (changedTaskTitles.length === 0) {
        showMessage('変更されたタスクがありません', 'info');
        return;
    }
    
    showMessage(`${changedTaskTitles.length}件の変更タスクの最新データを取得中...`, 'info');
    
    try {
        // 2. 個別ページデータを取得
        const latestPages = await scrapboxAPI.getMultiplePagesForTaskflow(changedTaskTitles);
        
        // 3. 最新ページデータを既存キャッシュにマージしてから変更点を適用
        const mergeResult = mergeManager.mergeWithIndividualPages(latestPages);
        allTasks = mergeResult.tasks;
        
        // 4. 競合があればアラート表示
        if (mergeResult.conflicts.length > 0) {
            showConflictAlert(mergeResult.conflicts);
        }
        
        // 5. originalJsonも更新（エクスポート用の整合性維持）
        updateOriginalJsonWithMergedPages(latestPages);
        
        // 6. UI再描画
        renderTasks();
        
        showMessage(`${latestPages.length}件の最新データをマージしました`, 'success');
        
    } catch (error) {
        console.error('個別ページ取得・マージエラー:', error);
        showMessage(`個別ページ取得に失敗しました: ${error.message}`, 'error');
    }
}

function getChangedTaskTitles() {
    // modifiedTaskIdsからページタイトル一覧を作成
    const changedTaskIds = mergeManager.getModifiedTaskIds();
    return Array.from(changedTaskIds).map(taskId => {
        const task = allTasks.find(t => t.id === taskId);
        return task ? task.title : null;
    }).filter(title => title);
}


function updateOriginalJsonWithMergedPages(updatedPages) {
    // originalJsonの該当ページを最新データで更新
    // エクスポート時の整合性を保つため
    if (!originalJson || !originalJson.pages) return;
    
    updatedPages.forEach(updatedPage => {
        const existingPageIndex = originalJson.pages.findIndex(page => page.id === updatedPage.id);
        if (existingPageIndex !== -1) {
            // 既存ページの更新
            originalJson.pages[existingPageIndex] = updatedPage;
        } else {
            // 新しいページとして追加（バックアップ後に作成されたページ対応）
            console.log(`originalJsonに新しいページを追加: ${updatedPage.id} (${updatedPage.title})`);
            originalJson.pages.push(updatedPage);
        }
    });
}