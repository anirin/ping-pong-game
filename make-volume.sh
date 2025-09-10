#! /bin/sh

if [ ! -f .env ]; then
    echo "no .env file here";
    exit 1;
fi;

set -a
source .env
set +a

if [ x${DATA_ROOT} == x ]; then
    echo "no DATA_ROOT set";
    exit 1;
fi;

mkdir -p ${DATA_ROOT}/files/abi
mkdir -p ${DATA_ROOT}/certs/server
mkdir -p ${DATA_ROOT}/certs/elk
mkdir -p ${DATA_ROOT}/certs/kibana
mkdir -p ${DATA_ROOT}/certs/logstash

if [ ! -f "${DATA_ROOT}/certs/server/server.crt" ]; then
    openssl req -x509 -newkey rsa:2048 -nodes \
        -keyout $DATA_ROOT/certs/server/server.key \
        -out $DATA_ROOT/certs/server/server.crt \
        -days 365 -subj "/CN=trascen.com";
fi;
