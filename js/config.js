// アプリケーション設定定義

const DEFAULT_CONFIG = {
    // 一般設定
    general: {
        scrapboxProjectName: 'your-project',
        taskIconName: 'leaves'
    },
    
    // API設定
    api: {
        enableAutoFetch: false,
        fetchInterval: 900, // 秒
        authToken: '',
        enableInitialFetch: true // 初回読み込み時のデータ取得
    },
    
    // タスク認識設定
    taskRecognition: {
        statusTags: 'Status_notStarted,Status_inProgress,Status_waiting,Status_review,Status_completed',
        stageTags: 'Stage_inactive,Stage_active,Stage_someday,Stage_temp',
        assigneeTags: 'Assigned to human,Assigned to ai',
        excludeTags: 'Exclude',
    },
    
    // エクスポート設定
    export: {
        filenameFormat: 'PROJECT-export-YYYY-MM-DD',
        destinationFolder: '',
        fetchBeforeExport: true,
        openImportPage: false
    }
};

const CONFIG_STORAGE_KEY = 'cosense-taskflow-config';