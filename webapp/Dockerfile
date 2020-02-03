FROM mhart/alpine-node:11 AS builder
WORKDIR /webapp
COPY . .
RUN npm install react-scripts -g --silent
RUN yarn install
RUN yarn run build

FROM mhart/alpine-node
RUN yarn global add serve
WORKDIR /webapp
COPY --from=builder /webapp/build .
CMD ["serve", "-p", "80", "-s", "."]doc