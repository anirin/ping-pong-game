NAME=trascen
COMPOSE_FILE=./compose.yml
COMPOSE=docker compose -f $(COMPOSE_FILE)
APP_IMAGE=frontend backend
APP_VOLUME=frontend_modules backend_modules
# VOLUME_DIR=/home/hmiyazak/data
# VOLUME_DIR=~/data

all: $(NAME)

$(NAME):
	$(COMPOSE) up -d

clean:
	$(COMPOSE) down

fclean-app:
	$(COMPOSE) down --volumes $(APP_VOLUME) --rmi $(APP_IMAGE)

fclean:
# 	sudo rm -rf $(VOLUME_DIR)
	$(COMPOSE) down --volumes --rmi all

stop:
	$(COMPOSE) stop

start:
	$(COMPOSE) start

log:
	$(COMPOSE) logs

re: fclean all
