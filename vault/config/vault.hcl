storage "file" {
  path = "/vault/data"
}

listener "tcp" {
  address = "0.0.0.0:8201"
  tls_disable = 1
}

api_addr = "http://0.0.0.0:8201"
ui = true

# ログ設定
log_level = "INFO"
