FROM hashicorp/vault:latest
WORKDIR /vault
COPY init.sh /vault/init.sh
RUN chmod +x /vault/init.sh
COPY config/ /vault/config/
EXPOSE 8201
ENTRYPOINT ["sh", "-c"]
CMD ["vault server -config=/vault/config/ & sleep 10 && export VAULT_ADDR=http://127.0.0.1:8201 && /vault/init.sh && wait"]