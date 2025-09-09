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
