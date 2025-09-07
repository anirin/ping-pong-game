NAME=trascen
COMPOSE_FILE=./compose.yml
COMPOSE=docker compose -f $(COMPOSE_FILE)
APP_IMAGE=frontend backend
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

stop:
	$(COMPOSE) stop

start:
	$(COMPOSE) start

log:
	$(COMPOSE) logs

build-f:
	docker compose -f ./compose.yml build --no-cache frontend

re: fclean all
