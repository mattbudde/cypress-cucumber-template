FROM cypress/base:10
RUN node --version
RUN npm --version
WORKDIR /home/node/app

COPY package.json package-lock.json ./

COPY cypress.json cypress ./
COPY cypress ./cypress
COPY tsconfig.json ./

ENV CI=1

# install NPM dependencies and Cypress binary
RUN npm ci
# check if the binary was installed successfully
RUN $(npm bin)/cypress verify