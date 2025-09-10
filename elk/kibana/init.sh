#!/bin/bash
set -e

echo "Waiting for Elasticsearch..."
until curl -s -k $ELASTICSEARCH_HOSTS >/dev/null; do
  sleep 5
done

echo "Applying ILM policy..."
curl -k -u elastic:$ELASTICSEARCH_PASSWORD \
  -X PUT "$ELASTICSEARCH_HOSTS/_ilm/policy/logs_policy" \
  -H 'Content-Type: application/json' \
  -d '{
  "policy": {
    "phases": {
      "hot": {
        "actions": {
          "rollover": {
            "max_age": "7d",
            "max_size": "50gb"
          }
        }
      },
      "delete": {
        "min_age": "42d",
        "actions": {
          "delete": {}
        }
      }
    }
  }
}' || true

echo "running kibana"
exec /usr/local/bin/kibana-docker