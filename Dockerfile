# o from diz para o docker que imagem baixar e que versão baixar
# após os dois pontos fica especificado a versão da imagem
FROM node:18.17.1
RUN npm install -g ts-node
WORKDIR /usr/src/app
ENV node_env=development
RUN rm -r /usr/src/app
COPY package*.json ./
#COPY .env-example ./.env
RUN npm i
COPY .env ./.env
COPY /. .
