FROM node:22-alpine AS builder

# ── 构建前端 ──────────────────────────────────
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# ── 构建后端 ──────────────────────────────────
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci
COPY server/ ./
RUN npm run build

# ── 生产镜像 ──────────────────────────────────
FROM node:22-alpine
WORKDIR /app

# 只装运行时依赖
COPY server/package*.json ./
RUN npm ci --omit=dev

# 复制后端编译产物
COPY --from=builder /app/server/dist ./dist

# 复制前端构建产物
COPY --from=builder /app/client/dist ./client/dist

# 创建数据目录
RUN mkdir -p /app/data /app/uploads

EXPOSE 3000
ENV NODE_ENV=production
ENV PORT=3000
ENV UPLOAD_DIR=/app/uploads

CMD ["node", "dist/index.js"]
