# Production Dockerfile for Scoutly Backend with Playwright Headed/Headless Chromium
FROM mcr.microsoft.com/playwright:v1.44.0-jammy

WORKDIR /app

# Copy root and backend package files
COPY package*.json ./
COPY backend/package*.json ./backend/

# Install dependencies
RUN npm run install:all

# Copy all source files
COPY backend ./backend
COPY data ./data
COPY Resume ./Resume

# Build TypeScript backend
RUN npm run build --prefix backend

# Set environment
ENV NODE_ENV=production
ENV PORT=3000
ENV BROWSER_MODE=playwright
ENV MOCK_MODE=false

EXPOSE 3000

# Start backend server
CMD ["npm", "run", "start", "--prefix", "backend"]
