// タスク作成ツール
class TaskCreator {
    constructor() {
        this.settingsManager = new SettingsManager();
        this.existingProjects = new Set();
        this.init();
    }

    init() {
        this.initializeSettings();
        this.loadExistingProjects();
        this.setupEventListeners();
        this.setDefaultValues();
    }

    // 設定から初期値を読み込み
    initializeSettings() {
        const config = this.settingsManager.loadConfig();
        
        // アサイン先の選択肢を設定から更新
        const assigneeTags = config.taskRecognition.assigneeTags.split(',').map(tag => tag.trim());
        const assigneeSelect = document.getElementById('assignee');
        assigneeSelect.innerHTML = '';
        
        assigneeTags.forEach(tag => {
            if (tag) {
                const option = document.createElement('option');
                option.value = tag;
                option.textContent = tag;
                assigneeSelect.appendChild(option);
            }
        });

        // ステータスの選択肢を設定から更新
        const statusTags = config.taskRecognition.statusTags.split(',').map(tag => tag.trim());
        const statusSelect = document.getElementById('status');
        statusSelect.innerHTML = '';
        
        statusTags.forEach(tag => {
            if (tag) {
                const option = document.createElement('option');
                option.value = tag;
                option.textContent = this.getStatusDisplayName(tag);
                if (tag === 'Status_notStarted') {
                    option.selected = true;
                }
                statusSelect.appendChild(option);
            }
        });

        // ステージの選択肢を設定から更新
        const stageTags = config.taskRecognition.stageTags.split(',').map(tag => tag.trim());
        const stageSelect = document.getElementById('stage');
        stageSelect.innerHTML = '';
        
        stageTags.forEach(tag => {
            if (tag) {
                const option = document.createElement('option');
                option.value = tag;
                option.textContent = this.getStageDisplayName(tag);
                if (tag === 'Stage_active') {
                    option.selected = true;
                }
                stageSelect.appendChild(option);
            }
        });
    }

    // 既存プロジェクトを読み込み（メインアプリと同じ仕組みを使用）
    async loadExistingProjects() {
        try {
            // メインアプリのallTasksが利用可能な場合はそれを使用
            if (typeof allTasks !== 'undefined' && allTasks.length > 0) {
                console.log('TaskCreator: メインアプリのallTasksからプロジェクト名を抽出');
                this.extractProjectsFromTasks(allTasks);
            } else {
                // フォールバック: localStorageから直接読み込み
                console.log('TaskCreator: localStorageから直接プロジェクト名を抽出');
                await this.loadProjectsFromStorage();
            }

            this.updateProjectSelect();
        } catch (error) {
            console.warn('既存プロジェクトの読み込みに失敗:', error);
        }
    }

    // メインアプリのallTasksからプロジェクト名を抽出（filters.jsと同じ方法）
    extractProjectsFromTasks(tasks) {
        tasks.forEach(task => {
            if (task.stem) {
                this.existingProjects.add(task.stem);
            }
        });
    }

    // フォールバック: localStorageから直接読み込み
    async loadProjectsFromStorage() {
        // 最新のバックアップキャッシュを探す
        const keys = Object.keys(localStorage);
        const config = this.settingsManager.loadConfig();
        const projectName = config.general.scrapboxProjectName || 'your-project';
        
        // そのプロジェクトの最新バックアップキャッシュを取得
        const cacheKeys = keys.filter(key => key.startsWith(`scrapbox_backup_${projectName}_`));
        
        if (cacheKeys.length > 0) {
            // 最新のキャッシュを取得
            const latestCacheKey = cacheKeys.sort().pop();
            try {
                const cacheData = JSON.parse(localStorage.getItem(latestCacheKey));
                if (cacheData && cacheData.data && cacheData.data.pages) {
                    console.log('TaskCreator: 最新のバックアップキャッシュからプロジェクト名を抽出');
                    this.extractProjectsFromPages(cacheData.data.pages);
                    return;
                }
            } catch (error) {
                console.warn('バックアップキャッシュの読み込みに失敗:', error);
            }
        }

        // さらなるフォールバック: 従来の方法
        const dataKeys = keys.filter(key => key.startsWith('visualizer-data-'));
        if (dataKeys.length > 0) {
            const latestKey = dataKeys.sort().pop();
            const data = JSON.parse(localStorage.getItem(latestKey));
            if (data && data.pages) {
                console.log('TaskCreator: visualizer-dataからプロジェクト名を抽出');
                this.extractProjectsFromPages(data.pages);
            }
        }
    }

    // ページデータからプロジェクト名を抽出（parseTaskと同じ方法）
    extractProjectsFromPages(pages) {
        const config = this.settingsManager.loadConfig();
        const taskIconName = config.general.taskIconName || 'leaves';
        const taskIconPattern = `[${taskIconName}.icon]`;
        
        pages.forEach(page => {
            // タスクページかどうかをチェック
            if (page.lines && Array.isArray(page.lines)) {
                // lineがオブジェクトの場合（バックアップAPI）とstring配列の場合（従来）に対応
                const lineTexts = page.lines.map(line => {
                    if (typeof line === 'object' && line.text !== undefined) {
                        return line.text;
                    } else if (typeof line === 'string') {
                        return line;
                    } else {
                        console.warn('Unexpected line format:', line);
                        return String(line);
                    }
                });
                
                const content = lineTexts.join('\n');
                
                // タスクアイコンが含まれている場合のみ処理
                if (content.includes(taskIconPattern)) {
                    // [stem.icon][project-name] の形式からプロジェクト名を抽出
                    const stemMatch = content.match(/\[stem\.icon\]\[([^\]]+)\]/);
                    if (stemMatch) {
                        this.existingProjects.add(stemMatch[1]);
                        console.log(`TaskCreator: プロジェクト名を発見: ${stemMatch[1]}`);
                    }
                }
            }
        });
    }

    // プロジェクト選択肢を更新
    updateProjectSelect() {
        const projectSelect = document.getElementById('project-name');
        const currentValue = projectSelect.value;
        
        // 既存のオプションをクリア（最初のプレースホルダーは残す）
        while (projectSelect.children.length > 1) {
            projectSelect.removeChild(projectSelect.lastChild);
        }
        
        // プロジェクト名をソートして追加
        const sortedProjects = Array.from(this.existingProjects).sort();
        sortedProjects.forEach(project => {
            const option = document.createElement('option');
            option.value = project;
            option.textContent = project;
            projectSelect.appendChild(option);
        });
        
        // 手動入力オプションを追加
        const manualOption = document.createElement('option');
        manualOption.value = 'manual-input';
        manualOption.textContent = '+ 新しいプロジェクト名を入力...';
        projectSelect.appendChild(manualOption);
        
        // 値を復元
        if (currentValue && (this.existingProjects.has(currentValue) || currentValue === 'manual-input')) {
            projectSelect.value = currentValue;
        }
        
        console.log(`TaskCreator: ${this.existingProjects.size}個のプロジェクトを読み込みました:`, Array.from(this.existingProjects));
    }

    // イベントリスナーを設定
    setupEventListeners() {
        document.getElementById('generate-task').addEventListener('click', () => this.generateTask());
        document.getElementById('reset-form').addEventListener('click', () => this.resetForm());
        document.getElementById('create-new-page').addEventListener('click', () => this.createNewPage());
        
        // プロジェクト名の手動入力対応
        const projectSelect = document.getElementById('project-name');
        projectSelect.addEventListener('change', () => {
            if (projectSelect.value === 'manual-input') {
                const customProject = prompt('プロジェクト名を入力してください:');
                if (customProject && customProject.trim()) {
                    this.existingProjects.add(customProject.trim());
                    this.updateProjectSelect();
                    projectSelect.value = customProject.trim();
                } else {
                    projectSelect.value = ''; // キャンセル時は未選択に戻す
                }
            }
        });
        
        // プロジェクト名のリロード機能
        document.addEventListener('keydown', (e) => {
            // Ctrl+R (または Cmd+R) でプロジェクト名をリロード
            if ((e.ctrlKey || e.metaKey) && e.key === 'r' && e.target.id === 'project-name') {
                e.preventDefault();
                this.loadExistingProjects();
                this.showMessage('プロジェクト名を再読み込みしました', 'info');
            }
        });
    }

    // デフォルト値を設定
    setDefaultValues() {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('start-date').value = today;
    }

    // タスクを生成
    generateTask() {
        const formData = this.getFormData();
        
        if (!this.validateForm(formData)) {
            return;
        }

        const taskText = this.buildTaskText(formData);
        
        // 生成されたテキストを表示
        document.getElementById('generated-task').textContent = taskText;
        
        // 自動的にクリップボードにコピー
        this.copyToClipboardInternal(taskText);
        
        // 新機能: キャッシュにタスクデータを追加
        this.addTaskToCache(formData, taskText);
        
        // 成功メッセージを一時的に表示
        this.showMessage('タスクを生成し、クリップボードにコピーしました。メインページに反映されます。', 'success');
    }

    // フォームデータを取得
    getFormData() {
        return {
            title: document.getElementById('task-title').value.trim(),
            projectName: document.getElementById('project-name').value,
            parentTask: document.getElementById('parent-task').value.trim(),
            assignee: document.getElementById('assignee').value,
            status: document.getElementById('status').value,
            stage: document.getElementById('stage').value,
            startDate: document.getElementById('start-date').value,
            dueDate: document.getElementById('due-date').value,
            importanceHigh: document.getElementById('importance-high').checked,
            urgencyHigh: document.getElementById('urgency-high').checked
        };
    }

    // フォームバリデーション
    validateForm(formData) {
        if (!formData.title) {
            this.showMessage('タスクタイトルを入力してください', 'error');
            return false;
        }
        
        if (!formData.projectName) {
            this.showMessage('プロジェクト名を選択してください', 'error');
            return false;
        }
        
        return true;
    }

    // タスクテキストを構築
    buildTaskText(formData) {
        const config = this.settingsManager.loadConfig();
        const taskIconName = config.general.taskIconName || 'leaves';
        const today = new Date().toISOString().split('T')[0];
        
        const lines = [];
        
        // タスクタイトル
        lines.push(formData.title);
        
        // 親タスク（from [parent-name]）
        const parentName = formData.parentTask || formData.projectName;
        lines.push(`from [${parentName}]`);
        
        // タスクアイコンと作成日
        lines.push(`[${taskIconName}.icon] 作成日:[${today}]`);
        
        // プロジェクトとアサイン先
        lines.push(`[stem.icon][${formData.projectName}] [${formData.assignee}]`);
        
        // ステータス
        lines.push(`[${formData.status}]`);
        
        // ステージ
        lines.push(`[${formData.stage}]`);
        
        // 日付行（開始日と期限日が両方ある場合のみ）
        if (formData.startDate || formData.dueDate) {
            let dateLine = '';
            if (formData.startDate) {
                dateLine += `Start Date [${formData.startDate}]`;
            }
            if (formData.dueDate) {
                if (dateLine) dateLine += ' ';
                dateLine += `Due Date [${formData.dueDate}]`;
            }
            lines.push(dateLine);
        }
        
        // オプション（重要度・緊急度）
        const options = [];
        if (formData.importanceHigh) {
            options.push('[Importance_high]');
        }
        if (formData.urgencyHigh) {
            options.push('[Urgency_high]');
        }
        if (options.length > 0) {
            lines.push(options.join(' '));
        }
        
        return lines.join('\n');
    }

    // フォームをリセット
    resetForm() {
        document.getElementById('task-title').value = '';
        document.getElementById('project-name').value = '';
        document.getElementById('parent-task').value = '';
        document.getElementById('assignee').selectedIndex = 0;
        document.getElementById('status').value = 'Status_notStarted';
        document.getElementById('stage').value = 'Stage_active';
        document.getElementById('start-date').value = '';
        document.getElementById('due-date').value = '';
        document.getElementById('importance-high').checked = false;
        document.getElementById('urgency-high').checked = false;
        
        document.getElementById('generated-task').textContent = 'タスクを生成するには、上記のフォームに入力して「タスクを生成」ボタンをクリックしてください。';
        
        this.setDefaultValues();
        this.showMessage('フォームをリセットしました', 'info');
    }

    // クリップボードにコピー（内部用）
    async copyToClipboardInternal(taskText) {
        try {
            await navigator.clipboard.writeText(taskText);
            console.log('TaskCreator: クリップボードにコピー完了');
        } catch (error) {
            console.error('TaskCreator: クリップボードへのコピーに失敗:', error);
            // エラーの場合はメッセージを表示しない（タスク生成成功が重要）
        }
    }

    // 新規ページ作成
    createNewPage() {
        const config = this.settingsManager.loadConfig();
        const projectName = config.general.scrapboxProjectName || 'your-project';
        const newPageUrl = `https://scrapbox.io/${projectName}/new`;
        
        try {
            // 新しいタブで開く
            window.open(newPageUrl, '_blank', 'noopener,noreferrer');
            this.showMessage('Scrapboxの新規ページ作成画面を開きました', 'success');
        } catch (error) {
            console.error('新規ページ作成エラー:', error);
            this.showMessage('新規ページ作成画面を開けませんでした', 'error');
        }
    }

    // ステータス表示名を取得
    getStatusDisplayName(status) {
        const statusMap = {
            'Status_notStarted': '未開始',
            'Status_inProgress': '進行中',
            'Status_waiting': '待機中',
            'Status_review': 'レビュー中',
            'Status_completed': '完了'
        };
        return statusMap[status] || status;
    }

    // ステージ表示名を取得
    getStageDisplayName(stage) {
        const stageMap = {
            'Stage_active': 'アクティブ',
            'Stage_inactive': '非アクティブ',
            'Stage_someday': 'いつか',
            'Stage_temp': '一時的'
        };
        return stageMap[stage] || stage;
    }

    // メッセージを表示
    showMessage(message, type = 'info') {
        // 既存のメッセージを削除
        const existingMsg = document.querySelector('.toast-message');
        if (existingMsg) {
            existingMsg.remove();
        }

        // 新しいメッセージを作成
        const messageDiv = document.createElement('div');
        messageDiv.className = `toast-message fixed top-4 right-4 px-4 py-2 rounded-md text-white z-50 transition-opacity duration-300`;
        
        switch (type) {
            case 'success':
                messageDiv.classList.add('bg-green-600');
                break;
            case 'error':
                messageDiv.classList.add('bg-red-600');
                break;
            case 'info':
            default:
                messageDiv.classList.add('bg-blue-600');
                break;
        }
        
        messageDiv.textContent = message;
        document.body.appendChild(messageDiv);

        // 3秒後に自動削除
        setTimeout(() => {
            messageDiv.style.opacity = '0';
            setTimeout(() => {
                if (messageDiv.parentNode) {
                    messageDiv.parentNode.removeChild(messageDiv);
                }
            }, 300);
        }, 3000);
    }

    // 新規メソッド: 生成したタスクデータをキャッシュに追加
    addTaskToCache(formData, taskText) {
        try {
            // scrapboxAPIを初期化（設定からプロジェクト名を取得）
            if (typeof scrapboxAPI !== 'undefined') {
                const config = this.settingsManager.loadConfig();
                const projectName = config.general.scrapboxProjectName;
                const authToken = config.api.authToken;
                
                if (!projectName) {
                    console.warn('TaskCreator: プロジェクト名が設定されていません');
                    return;
                }
                
                scrapboxAPI.initialize(projectName, authToken);
                console.log('TaskCreator: scrapboxAPI初期化完了', projectName);
            }
            
            // 仮のページIDを生成（実際のページが作成されるまでの暫定）
            const tempPageId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            // タスクテキストを行配列に変換
            const lines = taskText.split('\n').filter(line => line.trim());
            
            // Taskflow形式のページデータを作成
            const newPageData = {
                id: tempPageId,
                title: formData.title,
                updated: Math.floor(Date.now() / 1000),
                lines: lines
            };
            
            // キャッシュに追加（scrapbox-api.jsのaddPageToCacheを使用）
            if (typeof scrapboxAPI !== 'undefined') {
                scrapboxAPI.addPageToCache(newPageData);
                console.log('TaskCreator: 新しいタスクをキャッシュに追加', newPageData);
                
                // メインページにタスクが追加されたことを通知
                this.notifyMainPageToRefresh();
            }
            
        } catch (error) {
            console.warn('TaskCreator: キャッシュ追加エラー:', error);
            // エラーが発生してもタスク生成は成功として扱う
        }
    }

    // メインページに更新通知を送信
    notifyMainPageToRefresh() {
        try {
            // 同一オリジンの場合はwindow.postMessageで通信
            if (window.opener && !window.opener.closed) {
                window.opener.postMessage({
                    type: 'TASK_CREATED',
                    timestamp: Date.now()
                }, window.location.origin);
            }
            
            // localStorage経由でも通知（フォールバック）
            localStorage.setItem('taskflow_task_created', Date.now().toString());
            
        } catch (error) {
            console.warn('TaskCreator: メインページ通知エラー:', error);
        }
    }
}

// ページ読み込み時に初期化
document.addEventListener('DOMContentLoaded', () => {
    new TaskCreator();
});