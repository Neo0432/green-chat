FROM node:24-slim AS deps
WORKDIR /app
ENV HUSKY=0
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --network-timeout 600000

FROM deps AS dev
COPY . .
EXPOSE 3000
CMD ["yarn", "dev", "--host", "0.0.0.0"]

FROM deps AS build
COPY . .
RUN yarn build

FROM nginx:1.27-alpine AS runtime
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
