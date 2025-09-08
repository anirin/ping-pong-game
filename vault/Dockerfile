FROM hashicorp/vault:latest
WORKDIR /vault
COPY init.sh /vault/init.sh
RUN chmod +x /vault/init.sh
EXPOSE 8201
ENTRYPOINT ["sh", "-c"]
CMD ["vault server -dev -dev-root-token-id=myroot -dev-listen-address=0.0.0.0:8201 & export VAULT_ADDR=http://127.0.0.1:8201 && sleep 2 && /vault/init.sh && wait"]