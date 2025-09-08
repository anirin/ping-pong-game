# HashiCorp Vault セットアップ

このプロジェクトでは、HashiCorp Vaultを使用してシークレット管理を行っています。

## 設定内容

### 最低限の設定
- JWTシークレットの管理
- ポート設定の管理

## 使用方法

### 1. Vaultの起動
```bash
docker-compose up vault
```

### 2. Vault UIへのアクセス
- URL: http://localhost:8201
- Token: `myroot`

### 3. シークレットの確認
Vault UIまたはCLIで以下のパスを確認できます：
- `secret/data/jwt` - JWTシークレット
- `secret/data/app` - アプリケーション設定

### 4. アプリケーションの起動
```bash
docker-compose up
```

## 設定ファイル

- `vault/config/vault.hcl` - Vaultサーバー設定
- `vault/init.sh` - 初期化スクリプト

## 注意事項

- 開発環境用の設定です（本番環境では適切な認証と暗号化を設定してください）
- 現在は最低限の設定のみです
- フォールバック機能により、Vaultが利用できない場合は環境変数を使用します
