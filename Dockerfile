# Stage 1: Dependencies
FROM oven/bun:latest AS deps
WORKDIR /app

# Copy package files for dependency installation
COPY package.json bun.lock ./
COPY packages/api/package.json ./packages/api/
COPY packages/frontend/package.json ./packages/frontend/
COPY packages/shared/package.json ./packages/shared/

# Install dependencies (Bun will handle workspace linking)
# Omit --production flag to install all dependencies including devDependencies
# Note: Not using --frozen-lockfile to allow lockfile updates during build
RUN bun install

# Stage 2: Runtime
FROM oven/bun:latest AS runtime
WORKDIR /app

# Copy root package files
COPY package.json bun.lock ./

# Copy all node_modules from deps stage (Bun workspaces hoist most deps to root)
COPY --from=deps /app/node_modules ./node_modules

# Copy package directories with their node_modules (if any exist)
# This preserves the workspace structure
COPY --from=deps /app/packages ./packages

# Overwrite with latest source code (volumes handle this in dev, but needed for production)
COPY packages ./packages

# Default command (can be overridden in docker-compose)
CMD ["bun", "run", "dev"]

