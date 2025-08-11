// Scrapbox API連携モジュール

class ScrapboxAPI {
    constructor() {
        // 本番環境では直接API、開発環境ではプロキシサーバーを使用
        this.baseUrl = this.detectEnvironment();
        this.projectName = null;
        this.cookieToken = null;
    }
    
    // 環境を検出してAPIエンドポイントを決定
    detectEnvironment() {
        if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
            // ローカル開発環境：プロキシサーバーを使用
            return `http://localhost:8080/api`;
        } else {
            // サーバー環境：Flask APIを使用
            return '/api/scrapbox';
        }
    }

    // 設定を初期化
    initialize(projectName, cookieToken = null) {
        this.projectName = projectName;
        this.cookieToken = cookieToken;
    }

    // プロジェクトデータを取得（バックアップAPIを使用、キャッシュ対応）
    async getProjectData() {
        if (!this.projectName) {
            throw new Error('プロジェクト名が設定されていません');
        }

        try {
            // 最新のバックアップを取得
            const latestBackup = await this.getLatestBackup();
            if (!latestBackup) {
                throw new Error('利用可能なバックアップがありません');
            }

            // キャッシュされたデータがある場合
            const cachedData = this.getCachedBackup(latestBackup.id);
            if (cachedData) {
                console.log('ScrapboxAPI: キャッシュからデータを読み込み');
                return cachedData;
            }

            const backupData = await this.getBackup(latestBackup.id);
            
            // 最後に取得したバックアップIDを保存
            this.saveLastBackupId(latestBackup.id);
            
            const result = {
                pages: backupData.pages || [],
                projectName: this.projectName,
                count: backupData.count || 0,
                skip: backupData.skip || 0,
                backupId: latestBackup.id,
                backupCreated: latestBackup.backuped
            };
            
            // データをキャッシュに保存し、古いキャッシュを削除
            this.cacheBackup(latestBackup.id, result);
            this.clearProjectOldCache(latestBackup.id);
            
            return result;
        } catch (error) {
            console.error('ScrapboxAPI: データ取得エラー:', error);
            throw new Error(`Scrapboxからのデータ取得に失敗しました: ${error.message}`);
        }
    }

    // バックアップリストを取得
    async getBackupList() {
        if (!this.projectName) {
            throw new Error('プロジェクト名が設定されていません');
        }

        const url = this.baseUrl.includes('/api/scrapbox') 
            ? `${this.baseUrl}/project-backup/${this.projectName}/list`
            : `${this.baseUrl}/project-backup/${this.projectName}/list`;
        
        try {
            const headers = {
                'Accept': 'application/json',
            };
            
            // 認証トークンがある場合はAuthorizationヘッダーに追加
            if (this.cookieToken) {
                headers['Authorization'] = `Bearer ${this.cookieToken}`;
            }
            
            const response = await fetch(url, {
                method: 'GET',
                headers: headers
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            const backups = data.backups || [];
            return backups;
        } catch (error) {
            console.error('ScrapboxAPI: バックアップリスト取得エラー:', error);
            throw new Error(`バックアップリストの取得に失敗しました: ${error.message}`);
        }
    }

    // 特定のバックアップを取得
    async getBackup(backupId) {
        if (!this.projectName) {
            throw new Error('プロジェクト名が設定されていません');
        }

        const url = this.baseUrl.includes('/api/scrapbox') 
            ? `${this.baseUrl}/project-backup/${this.projectName}/${backupId}.json`
            : `${this.baseUrl}/project-backup/${this.projectName}/${backupId}.json`;
        
        try {
            const headers = {
                'Accept': 'application/json',
            };
            
            // 認証トークンがある場合はAuthorizationヘッダーに追加
            if (this.cookieToken) {
                headers['Authorization'] = `Bearer ${this.cookieToken}`;
            }
            
            const response = await fetch(url, {
                method: 'GET',
                headers: headers
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error(`ScrapboxAPI: バックアップ取得エラー (${backupId}):`, error);
            throw new Error(`バックアップの取得に失敗しました: ${error.message}`);
        }
    }

    // 最新のバックアップを取得
    async getLatestBackup() {
        const backups = await this.getBackupList();
        console.log('ScrapboxAPI: getLatestBackup - backups:', backups, 'type:', typeof backups);
        
        if (!backups || !Array.isArray(backups) || backups.length === 0) {
            console.log('ScrapboxAPI: バックアップリストが空またはnull');
            return null;
        }
        
        // バックアップを作成日時順でソート（最新が最初）- backupedフィールドを使用
        backups.sort((a, b) => b.backuped - a.backuped);
        return backups[0];
    }

    // 新しいバックアップがあるかチェック
    async hasNewBackup() {
        try {
            const latestBackup = await this.getLatestBackup();
            if (!latestBackup) {
                return false;
            }

            const lastBackupId = this.getLastBackupId();
            
            return lastBackupId !== latestBackup.id;
        } catch (error) {
            console.error('ScrapboxAPI: 新しいバックアップチェックエラー:', error);
            return false;
        }
    }

    // 最後に取得したバックアップIDを保存
    saveLastBackupId(backupId) {
        const key = `cosense-taskflow-last-backup-${this.projectName}`;
        localStorage.setItem(key, backupId);
    }

    // 最後に取得したバックアップIDを取得
    getLastBackupId() {
        const key = `cosense-taskflow-last-backup-${this.projectName}`;
        return localStorage.getItem(key);
    }

    // 特定のページの詳細を取得
    async getPageDetail(pageTitle) {
        if (!this.projectName) {
            throw new Error('プロジェクト名が設定されていません');
        }

        const encodedTitle = encodeURIComponent(pageTitle);
        const url = `${this.baseUrl}/pages/${this.projectName}/${encodedTitle}`;
        
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error(`ScrapboxAPI: ページ詳細取得エラー (${pageTitle}):`, error);
            throw new Error(`ページ詳細の取得に失敗しました: ${error.message}`);
        }
    }

    // ページを更新（要認証 - 将来実装予定）
    async updatePage(pageTitle, lines) {
        if (!this.cookieToken) {
            throw new Error('認証が必要です。Cookie認証を設定してください。');
        }

        // この機能は将来のバージョンで実装予定
        console.warn('ScrapboxAPI: ページ更新機能は未実装です');
        throw new Error('ページ更新機能は現在実装中です');
    }

    // プロジェクトの基本情報を取得
    async getProjectInfo() {
        if (!this.projectName) {
            throw new Error('プロジェクト名が設定されていません');
        }

        const url = this.baseUrl.includes('/api/scrapbox') 
            ? `${this.baseUrl}/projects/${this.projectName}/info`
            : `${this.baseUrl}/projects/${this.projectName}`;
        
        try {
            const headers = {
                'Accept': 'application/json',
            };
            
            // 認証トークンがある場合はAuthorizationヘッダーに追加
            if (this.cookieToken) {
                headers['Authorization'] = `Bearer ${this.cookieToken}`;
            }
            
            const response = await fetch(url, {
                method: 'GET',
                headers: headers
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('ScrapboxAPI: プロジェクト情報取得エラー:', error);
            throw new Error(`プロジェクト情報の取得に失敗しました: ${error.message}`);
        }
    }

    // 接続テスト
    async testConnection() {
        try {
            console.log('ScrapboxAPI: 接続テスト開始');
            const projectInfo = await this.getProjectInfo();
            console.log('ScrapboxAPI: 接続テスト成功', projectInfo);
            return {
                success: true,
                projectInfo: projectInfo
            };
        } catch (error) {
            console.error('ScrapboxAPI: 接続テスト失敗:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Scrapbox形式のデータをcosense-taskflow形式に変換
    convertToVisualizerFormat(scrapboxData) {
        if (!scrapboxData.pages) {
            throw new Error('不正なScrapboxデータ形式です');
        }

        const convertedData = {
            pages: scrapboxData.pages.map(page => {
                // バックアップAPIの場合、linesは {text: string, created: number, updated: number, userId: string}[] 形式
                let convertedLines;
                if (page.lines && Array.isArray(page.lines)) {
                    convertedLines = page.lines.map(line => {
                        // lineがオブジェクトの場合はtextプロパティを取得、文字列の場合はそのまま
                        if (typeof line === 'object' && line.text !== undefined) {
                            return line.text;
                        } else if (typeof line === 'string') {
                            return line;
                        } else {
                            console.warn('Unexpected line format:', line);
                            return String(line);
                        }
                    });
                } else {
                    convertedLines = [page.title]; // ページタイトルのみの場合
                }

                return {
                    id: page.id,
                    title: page.title,
                    updated: page.updated,
                    lines: convertedLines
                };
            }),
            projectName: scrapboxData.projectName,
            fetchedAt: Math.floor(Date.now() / 1000)
        };

        return convertedData;
    }

    // バックアップデータをキャッシュに保存
    cacheBackup(backupId, data) {
        try {
            const cacheKey = `scrapbox_backup_${this.projectName}_${backupId}`;
            const cacheData = {
                data: data,
                cached: Date.now(),
                backupId: backupId,
                projectName: this.projectName
            };
            localStorage.setItem(cacheKey, JSON.stringify(cacheData));
            console.log(`ScrapboxAPI: バックアップ ${backupId} をキャッシュに保存`);
        } catch (error) {
            console.warn('ScrapboxAPI: キャッシュ保存エラー:', error);
        }
    }

    // キャッシュからバックアップデータを取得
    getCachedBackup(backupId) {
        try {
            const cacheKey = `scrapbox_backup_${this.projectName}_${backupId}`;
            const cached = localStorage.getItem(cacheKey);
            if (cached) {
                const cacheData = JSON.parse(cached);
                return cacheData.data;
            }
            return null;
        } catch (error) {
            console.warn('ScrapboxAPI: キャッシュ読み込みエラー:', error);
            return null;
        }
    }

    // プロジェクトの古いバックアップキャッシュをクリア（新バックアップ時に実行）
    clearProjectOldCache(currentBackupId) {
        try {
            const keys = Object.keys(localStorage);
            const cachePrefix = `scrapbox_backup_${this.projectName}_`;
            let cleared = 0;

            keys.forEach(key => {
                if (key.startsWith(cachePrefix) && !key.includes(currentBackupId)) {
                    localStorage.removeItem(key);
                    cleared++;
                }
            });

            if (cleared > 0) {
                console.log(`ScrapboxAPI: ${cleared}件の古いバックアップキャッシュを削除`);
            }
        } catch (error) {
            console.warn('ScrapboxAPI: キャッシュクリアエラー:', error);
        }
    }

    // プロジェクト変更時に古いプロジェクトのキャッシュを削除
    clearProjectCache(oldProjectName) {
        try {
            const keys = Object.keys(localStorage);
            const cachePrefix = `scrapbox_backup_${oldProjectName}_`;
            let cleared = 0;

            keys.forEach(key => {
                if (key.startsWith(cachePrefix)) {
                    localStorage.removeItem(key);
                    cleared++;
                }
            });

            if (cleared > 0) {
                console.log(`ScrapboxAPI: ${oldProjectName}の${cleared}件のキャッシュを削除`);
            }
        } catch (error) {
            console.warn('ScrapboxAPI: キャッシュクリアエラー:', error);
        }
    }

    // すべてのバックアップキャッシュを削除（手動削除用）
    clearAllCache() {
        try {
            const keys = Object.keys(localStorage);
            let cleared = 0;

            keys.forEach(key => {
                if (key.startsWith('scrapbox_backup_')) {
                    localStorage.removeItem(key);
                    cleared++;
                }
            });

            console.log(`ScrapboxAPI: ${cleared}件のキャッシュを削除`);
            return cleared;
        } catch (error) {
            console.warn('ScrapboxAPI: キャッシュクリアエラー:', error);
            throw error;
        }
    }

    // APIの利用状況を取得（デバッグ用）
    getUsageStats() {
        const cacheInfo = this.getCacheInfo();
        return {
            projectName: this.projectName,
            hasAuthentication: !!this.cookieToken,
            baseUrl: this.baseUrl,
            initialized: !!this.projectName,
            cache: cacheInfo
        };
    }

    // キャッシュ情報を取得
    getCacheInfo() {
        try {
            const keys = Object.keys(localStorage);
            const cachePrefix = `scrapbox_backup_${this.projectName}_`;
            const cacheKeys = keys.filter(key => key.startsWith(cachePrefix));
            return {
                count: cacheKeys.length,
                keys: cacheKeys,
                enabled: true // 常に有効
            };
        } catch (error) {
            return { count: 0, keys: [], enabled: true };
        }
    }
}

// グローバルインスタンス
const scrapboxAPI = new ScrapboxAPI();