FROM node
ENV NODE_ENV production
WORKDIR /usr/src/app
COPY ["package.json", "package-lock.json*", "npm-shrinkwrap.json*", "./"]
RUN apt-get update && apt-get install -y git
RUN npm install --production --silent && mv node_modules ../
COPY . .
EXPOSE 3000
CMD npm start