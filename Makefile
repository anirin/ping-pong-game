NAME=trascen
COMPOSE_FILE=./compose.yml
COMPOSE=docker compose -f $(COMPOSE_FILE)
APP_IMAGE=ping-pong-game-frontend ping-pong-game-backend
APP_VOLUME=frontend_modules backend_modules

all: $(NAME)

$(NAME):
	$(COMPOSE) up -d

clean:
	$(COMPOSE) down

clean-volumes:
	$(COMPOSE) down --volumes

fclean:
	$(COMPOSE) down --volumes --rmi all

fclean-local:
	$(COMPOSE) down --volumes
	docker image rm $(APP_IMAGE)

stop:
	$(COMPOSE) stop

start:
	$(COMPOSE) start

log:
	$(COMPOSE) logs

build-backend:
	docker-compose build --no-cache backend

build-vault:
	docker-compose build --no-cache vault

re: fclean all
