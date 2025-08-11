#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Scrapbox API Proxy Server
CORS制限を回避するためのプロキシサーバ
"""

import json
import urllib.request
import urllib.parse
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.error import HTTPError, URLError

class ScrapboxProxyHandler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        """CORS preflight request に対応"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.send_header('Access-Control-Max-Age', '86400')
        self.end_headers()
        
    def do_GET(self):
        """GET request を処理"""
        try:
            # パスを解析
            path = self.path
            print(f"リクエストパス: {path}")
            
            if path.startswith('/api/'):
                # /api/page-data/export/{project}.json -> https://scrapbox.io/api/page-data/export/{project}.json
                scrapbox_url = f"https://scrapbox.io{path}"
                print(f"Scrapbox URL: {scrapbox_url}")
                
                # Scrapbox APIへリクエスト
                response = self.fetch_from_scrapbox(scrapbox_url)
                
                # レスポンス送信
                self.send_response(200)
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
                self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
                self.send_header('Access-Control-Max-Age', '86400')
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                
                self.wfile.write(response.encode('utf-8'))
                
            else:
                # 不正なパス
                self.send_error(404, "Not Found")
                
        except Exception as e:
            print(f"エラー: {e}")
            self.send_error(500, str(e))
    
    def fetch_from_scrapbox(self, url):
        """Scrapbox APIからデータを取得"""
        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (cosense-taskflow proxy)',
                'Accept': 'application/json'
            }
            
            # デバッグ: 受信したヘッダーをすべて表示
            print("📨 受信ヘッダー:")
            for header_name, header_value in self.headers.items():
                print(f"   {header_name}: {header_value}")
            
            # フロントエンドからのAuthorizationヘッダーをCookieとして転送
            auth_header = self.headers.get('Authorization')
            print(f"🔍 Authorization ヘッダー: {auth_header}")
            
            if auth_header and auth_header.startswith('Bearer '):
                cookie_value = auth_header[7:]  # "Bearer " を除去
                headers['Cookie'] = f'connect.sid={cookie_value}'
                print(f"🔐 Cookie認証を使用:")
                print(f"   Cookie値: {cookie_value}")
                print(f"   送信URL: {url}")
            else:
                print("🔓 認証なしでリクエスト")
                print(f"   理由: auth_header='{auth_header}'")
            
            req = urllib.request.Request(url, headers=headers)
            
            with urllib.request.urlopen(req, timeout=30) as response:
                data = response.read().decode('utf-8')
                print(f"取得完了: {len(data)} bytes")
                return data
                
        except HTTPError as e:
            error_msg = f"HTTP Error {e.code}: {e.reason}"
            print(error_msg)
            raise Exception(error_msg)
            
        except URLError as e:
            error_msg = f"URL Error: {e.reason}"
            print(error_msg)
            raise Exception(error_msg)
            
        except Exception as e:
            error_msg = f"Request Error: {str(e)}"
            print(error_msg)
            raise Exception(error_msg)
    
    def log_message(self, format, *args):
        """ログメッセージをカスタマイズ"""
        print(f"[{self.address_string()}] {format % args}")

def run_proxy_server(port=8080):
    """プロキシサーバーを開始"""
    server_address = ('localhost', port)
    httpd = HTTPServer(server_address, ScrapboxProxyHandler)
    
    print(f"Scrapbox APIプロキシサーバーを開始しました")
    print(f"ポート: {port}")
    print(f"URL: http://localhost:{port}")
    print(f"例: http://localhost:{port}/api/pages/your-project")
    print("Ctrl+C で停止します")
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nサーバーを停止しています...")
        httpd.server_close()
        print("サーバーを停止しました")

if __name__ == "__main__":
    import sys
    
    port = 8080
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            print("無効なポート番号です。デフォルトの8080を使用します。")
    
    run_proxy_server(port)