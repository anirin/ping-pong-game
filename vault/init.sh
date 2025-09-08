#!/bin/bash


echo "Vault初期化を開始..."
sleep 5

vault secrets enable -path=secret kv-v2
vault kv put secret/jwt secret="your-super-secret-jwt-key-here"
vault kv put secret/app port="8080"

echo "Vault初期化完了"
