# Multi-language code execution environment
FROM node:18-alpine

# Install Docker CLI and other dependencies
RUN apk add --no-cache \
    docker \
    docker-compose \
    python3 \
    py3-pip \
    openjdk17 \
    gcc \
    g++ \
    musl-dev \
    go \
    rust \
    cargo

# Create working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install Node.js dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Create non-root user for security
RUN addgroup -g 1001 -S executor && \
    adduser -S executor -u 1001 -G executor

# Set permissions
RUN chown -R executor:executor /app

# Switch to non-root user
USER executor

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node healthcheck.js

# Start the application
CMD ["node", "src/executor-server.js"] 