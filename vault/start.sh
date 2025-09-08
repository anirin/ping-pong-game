#!/bin/sh

echo "Vaultサーバーを起動中..."
vault server -dev -dev-root-token-id=myroot -dev-listen-address=0.0.0.0:8201 &

echo "Vaultの起動を待機中..."
export VAULT_ADDR=http://127.0.0.1:8201
until vault status >/dev/null 2>&1; do
    echo "Vaultの起動を待機中..."
    sleep 1
done

echo "Vault初期化スクリプトを実行中..."
/vault/init.sh

echo "Vaultサーバーを待機中..."
wait
