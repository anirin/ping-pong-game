#! /bin/sh

chown root:root /usr/share/filebeat/filebeat.yml
chmod go-w /usr/share/filebeat/filebeat.yml
exec filebeat -e
