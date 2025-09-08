#!/bin/sh

# Vaultの起動を待機
echo "Vaultの起動を待機中..."
until vault status >/dev/null 2>&1; do
    echo "Vaultの起動を待機中..."
    sleep 1
done
echo "Vaultが起動しました"

echo "監査ログを有効化中..."
vault audit enable file file_path=/vault/logs/audit.log

echo "Vaultのシークレットエンジンを設定中..."
vault secrets enable -path=secret kv-v2
vault kv put secret/jwt secret="secret"
vault kv put secret/server port="8080"

echo "Vault初期化完了"
