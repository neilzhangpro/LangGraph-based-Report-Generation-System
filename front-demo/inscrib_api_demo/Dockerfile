# 使用多阶段构建
FROM node:20 AS builder

WORKDIR /app

# 添加构建参数
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

# 复制 package.json 和 package-lock.json
COPY package*.json ./

# 安装依赖
RUN npm ci

# 复制源代码
COPY . .

# 构建应用
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# 生产环境
FROM node:20 AS runner

WORKDIR /app

# 设置环境变量
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT 3001

# 在运行时也设置 API URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

# 复制必要文件
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# 暴露端口
EXPOSE 3001

# 启动应用
CMD ["node", "server.js"]