# Use an official Node runtime as a parent image
FROM node:18-slim

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package.json ./
# If you have a package-lock.json uncomment the next line and add the file
# COPY package-lock.json ./
RUN npm install --production

# Bundle app source
COPY . .

EXPOSE 3000

CMD [ "node", "server.js" ]
