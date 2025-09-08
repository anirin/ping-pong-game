FROM hashicorp/vault:latest
WORKDIR /vault
COPY start.sh /vault/start.sh
RUN chmod +x /vault/start.sh
RUN mkdir -p /vault/logs
EXPOSE 8201
CMD ["/vault/start.sh"]
