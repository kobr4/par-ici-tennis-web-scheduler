FROM node:18-slim

RUN mkdir -p /home/node/app/node_modules && chown -R node:node /home/node/app

WORKDIR /home/node/app

COPY package*.json ./

USER node

COPY --chown=node:node . .

RUN npm install

RUN npx playwright install

USER root

RUN npx playwright install-deps

USER node

COPY --chown=node:node . .

EXPOSE 8080

CMD [ "node", "main.js" ]
