NAME=ping-pong-game
COMPOSE_FILE=./compose.yml
COMPOSE=docker compose -f $(COMPOSE_FILE)
APP_IMAGE=$(NAME)-frontend $(NAME)-backend $(NAME)-blockchain
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

fclean-host:
	docker container stop $(docker container ls -aq)
	docker container rm $(docker container ls -aq)
	docker image rm $(docker images -aq)
	docker volume rm $(docker volume ls -q)

re: fclean all

re-right: fclean-local all
