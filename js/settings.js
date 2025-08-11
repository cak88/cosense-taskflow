// 設定管理機能

class SettingsManager {
    constructor() {
        this.config = this.loadConfig();
    }

    // 設定をlocalStorageから読み込み
    loadConfig() {
        try {
            const saved = localStorage.getItem(CONFIG_STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                return this.mergeWithDefault(parsed);
            }
        } catch (error) {
            console.warn('設定の読み込みに失敗しました:', error);
        }
        return { ...DEFAULT_CONFIG };
    }

    // デフォルト設定とマージ（新しい設定項目に対応）
    mergeWithDefault(userConfig) {
        const merged = { ...DEFAULT_CONFIG };
        
        // 各カテゴリをマージ
        Object.keys(DEFAULT_CONFIG).forEach(category => {
            if (userConfig[category]) {
                merged[category] = { ...DEFAULT_CONFIG[category], ...userConfig[category] };
            }
        });
        
        return merged;
    }

    // 設定をlocalStorageに保存
    saveConfig() {
        try {
            localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(this.config));
            return true;
        } catch (error) {
            console.error('設定の保存に失敗しました:', error);
            return false;
        }
    }

    // 設定値を取得
    get(category, key) {
        return this.config[category]?.[key] ?? DEFAULT_CONFIG[category]?.[key];
    }

    // 設定値を更新
    set(category, key, value) {
        if (!this.config[category]) {
            this.config[category] = {};
        }
        this.config[category][key] = value;
        return this.saveConfig();
    }

    // カテゴリ全体を更新
    setCategory(category, values) {
        this.config[category] = { ...this.config[category], ...values };
        return this.saveConfig();
    }

    // 設定をリセット
    reset() {
        this.config = { ...DEFAULT_CONFIG };
        return this.saveConfig();
    }

    // 現在の設定を取得
    getAll() {
        return { ...this.config };
    }

    // タスク認識アイコンの完全なパターンを取得
    getTaskIconPattern() {
        const iconName = this.get('general', 'taskIconName');
        return `[${iconName}.icon]`;
    }

    // Scrapbox インポート画面のURLを生成
    getScrapboxImportUrl() {
        const projectName = this.get('general', 'scrapboxProjectName');
        return `https://scrapbox.io/projects/${projectName}/settings/page-data`;
    }

    // Scrapbox URLを生成
    getScrapboxUrl(pageName) {
        const projectName = this.get('general', 'scrapboxProjectName');
        return `https://scrapbox.io/${projectName}/${encodeURIComponent(pageName)}`;
    }

    // エクスポートファイル名を生成
    generateExportFilename() {
        const format = this.get('export', 'filenameFormat');
        const projectName = this.get('general', 'scrapboxProjectName');
        const now = new Date();
        
        // より具体的なパターンから順番に置換（重複を防ぐため）
        let filename = format;
        filename = filename.replace(/PROJECT/g, projectName); // プロジェクト名を置換
        filename = filename.replace(/YYYY/g, now.getFullYear());
        filename = filename.replace(/MM/g, String(now.getMonth() + 1).padStart(2, '0'));
        filename = filename.replace(/DD/g, String(now.getDate()).padStart(2, '0'));
        filename = filename.replace(/HH/g, String(now.getHours()).padStart(2, '0'));
        filename = filename.replace(/mm/g, String(now.getMinutes()).padStart(2, '0'));
        
        return `${filename}.json`;
    }
}

// グローバルインスタンス
const settingsManager = new SettingsManager();