FROM node:21.5.0
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install --frozen-lockfile

COPY . .

EXPOSE 8080

CMD ["node", "--env-file=.env", "server.js"]