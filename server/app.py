#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
cosense-taskflow Server Version
Flask ベースのウェブアプリケーション
"""

from flask import Flask, render_template, jsonify, request, send_from_directory
import requests
import json
import os
from datetime import datetime

app = Flask(__name__)

# 設定
SCRAPBOX_API_BASE = 'https://scrapbox.io/api'
STATIC_FOLDER = os.path.join(os.path.dirname(__file__), '..', 'static')

@app.route('/')
def index():
    """メインページ"""
    return send_from_directory('..', 'index.html')

@app.route('/js/<path:filename>')
def serve_js(filename):
    """JavaScript ファイルを提供"""
    return send_from_directory(os.path.join('..', 'js'), filename)

@app.route('/css/<path:filename>')
def serve_css(filename):
    """CSS ファイルを提供"""
    return send_from_directory(os.path.join('..', 'css'), filename)

@app.route('/api/scrapbox/projects/<project_name>/pages')
def get_project_pages(project_name):
    """Scrapbox プロジェクトのページ一覧を取得"""
    try:
        # Scrapbox API へリクエスト
        url = f"{SCRAPBOX_API_BASE}/pages/{project_name}"
        
        print(f"Fetching: {url}")
        
        headers = {
            'User-Agent': 'cosense-taskflow-server/1.0',
            'Accept': 'application/json'
        }
        
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()
        
        data = response.json()
        
        # cosense-taskflow 形式に変換
        converted_data = {
            'pages': [],
            'projectName': project_name,
            'fetchedAt': int(datetime.now().timestamp())
        }
        
        # pages に lines を追加（タイトルのみの場合）
        for page in data.get('pages', []):
            converted_page = {
                'id': page.get('id'),
                'title': page.get('title'),
                'updated': page.get('updated'),
                'lines': page.get('lines', [page.get('title')])  # lines がない場合はタイトルのみ
            }
            converted_data['pages'].append(converted_page)
        
        print(f"Successfully fetched {len(converted_data['pages'])} pages")
        
        return jsonify(converted_data)
        
    except requests.exceptions.RequestException as e:
        print(f"Request error: {e}")
        return jsonify({
            'error': f'Scrapbox API request failed: {str(e)}',
            'status': 'error'
        }), 500
    
    except Exception as e:
        print(f"Unexpected error: {e}")
        return jsonify({
            'error': f'Unexpected error: {str(e)}',
            'status': 'error'
        }), 500

@app.route('/api/scrapbox/projects/<project_name>/info')
def get_project_info(project_name):
    """Scrapbox プロジェクトの基本情報を取得"""
    try:
        url = f"{SCRAPBOX_API_BASE}/projects/{project_name}"
        
        headers = {
            'User-Agent': 'cosense-taskflow-server/1.0',
            'Accept': 'application/json'
        }
        
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        
        data = response.json()
        return jsonify(data)
        
    except requests.exceptions.RequestException as e:
        print(f"Request error: {e}")
        return jsonify({
            'error': f'Project info request failed: {str(e)}',
            'status': 'error'
        }), 500

@app.route('/api/health')
def health_check():
    """ヘルスチェック"""
    return jsonify({
        'status': 'ok',
        'timestamp': datetime.now().isoformat(),
        'version': '1.0.0'
    })

@app.errorhandler(404)
def not_found(error):
    return jsonify({
        'error': 'Not Found',
        'status': 'error'
    }), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({
        'error': 'Internal Server Error',
        'status': 'error'
    }), 500

if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='cosense-taskflow Server')
    parser.add_argument('--host', default='0.0.0.0', help='Host to bind to')
    parser.add_argument('--port', type=int, default=5000, help='Port to bind to')
    parser.add_argument('--debug', action='store_true', help='Enable debug mode')
    
    args = parser.parse_args()
    
    print(f"Starting cosense-taskflow server...")
    print(f"Host: {args.host}")
    print(f"Port: {args.port}")
    print(f"Debug: {args.debug}")
    
    app.run(host=args.host, port=args.port, debug=args.debug)