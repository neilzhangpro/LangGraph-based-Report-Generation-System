# 使用 Node.js 官方镜像作为基础镜像
FROM node:18

# 设置工作目录
WORKDIR /usr/src/app
# 创建上传目录并设置权限
RUN mkdir -p /usr/src/app/uploads && \
    chown -R node:node /usr/src/app/uploads && \
    chmod 755 /usr/src/app/uploads
# 复制 package.json 和 yarn.lock
COPY package.json yarn.lock ./

# 安装依赖
RUN yarn install

# 复制源代码
COPY . .

# 构建应用
RUN yarn build

# 暴露端口（根据你的应用配置修改）
EXPOSE 3000
# 切换到非 root 用户
USER node
# 运行应用
CMD [ "yarn", "start:prod" ]
