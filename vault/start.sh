#!/bin/sh

vault server -dev -dev-root-token-id=myroot -dev-listen-address=0.0.0.0:8201 &

until vault status >/dev/null 2>&1; do
    sleep 1
done

if ! vault audit list | grep -q "file/"; then
    vault audit enable file file_path=/vault/logs/audit.log
fi

if ! vault secrets list | grep -q "secret/"; then
    vault secrets enable -path=secret kv-v2
fi

if ! vault kv get secret/jwt >/dev/null 2>&1; then
    vault kv put secret/jwt secret="secret"
fi

if ! vault kv get secret/server >/dev/null 2>&1; then
    vault kv put secret/server port="8080"
fi

wait