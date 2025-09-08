#!/bin/sh

# Vaultの起動を待機（開発モードでは数秒で起動する）
echo "Vaultの起動を待機中..."
sleep 5
echo "Vaultが起動しました"

echo "Vaultのシークレットエンジンを設定中..."
vault secrets enable -path=secret kv-v2
vault kv put secret/jwt secret="secret"
vault kv put secret/server port="8080"

echo "Vault初期化完了"
