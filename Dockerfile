# Build stage
FROM node:18-alpine AS builder

# Install pnpm
RUN npm install -g pnpm@10.0.0

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml osiris.json ./

# Install all dependencies (including dev)
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN pnpm run build

# Production stage
FROM node:18-alpine AS production

# Install runtime dependencies only
RUN apk add --no-cache curl dumb-init && \
    npm install -g pnpm@10.0.0

# Create app user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S ostium -u 1001 -G nodejs

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml osiris.json ./

# Install only production dependencies
RUN pnpm install --frozen-lockfile --prod

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Create necessary directories
RUN mkdir -p logs config && \
    chown -R ostium:nodejs /app

# Switch to non-root user
USER ostium

EXPOSE 3000

# HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
#     CMD curl -f http://localhost:3000/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
