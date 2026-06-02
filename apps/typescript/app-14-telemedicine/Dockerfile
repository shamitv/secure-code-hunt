FROM public.ecr.aws/docker/library/node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
RUN cp -r src/db/migrations dist/db/ && cp -r src/db/seeds dist/db/ || true
EXPOSE 8014
CMD ["npm", "start"]
