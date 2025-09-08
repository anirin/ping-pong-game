FROM hashicorp/vault:latest
WORKDIR /vault
COPY init.sh /vault/init.sh
COPY start.sh /vault/start.sh
RUN chmod +x /vault/init.sh /vault/start.sh
RUN mkdir -p /vault/logs
EXPOSE 8201
CMD ["/vault/start.sh"]