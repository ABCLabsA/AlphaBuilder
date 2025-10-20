# NestJS + Prisma 应用 Dockerfile
FROM node:20-bullseye as builder

# 设置工作目录
WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm

# 切换 pnpm 源为国内镜像以避免超时
RUN pnpm config set registry https://registry.npmmirror.com

# 创建非 root 用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001 -G nodejs

# 复制 package.json 和 pnpm-lock.yaml，并提前切换归属
COPY --chown=nestjs:nodejs package.json pnpm-lock.yaml ./

# 安装依赖（包括 devDependencies，因为需要构建工具）
RUN pnpm install --frozen-lockfile

# 复制源代码，并直接赋予 nestjs 用户权限
COPY --chown=nestjs:nodejs . .

# 生成 Prisma 客户端
RUN pnpm prisma generate

# 构建应用
RUN pnpm build

# 调试：检查构建结果
RUN ls -la dist/ && ls -la dist/main.js

# 删除开发依赖，只保留生产依赖
RUN pnpm prune --prod

# 切换为非 root 用户运行
USER nestjs

# 暴露端口
EXPOSE 4000

# 启动应用
CMD ["pnpm", "run", "start:prod"]
