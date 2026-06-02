FROM public.ecr.aws/docker/library/node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 8036
CMD ["npm", "start"]
