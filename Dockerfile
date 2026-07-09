# ==========================================
# Multi-stage Dockerfile untuk Deploy Production
# Cocok untuk Koyeb, Hugging Face Spaces (Docker), Railway, Render, dll.
# ==========================================

# Stage 1: Build Phase
FROM node:20-slim AS builder

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install all dependencies (termasuk devDependencies untuk build)
RUN npm ci

# Copy sisa source code aplikasi
COPY . .

# Jalankan build frontend & backend server
RUN npm run build

# Stage 2: Production Phase
FROM node:20-slim

WORKDIR /app

# Set environment variables
ENV NODE_ENV=production
ENV PORT=7860

# Copy package manifests untuk start script
COPY package*.json ./

# Install hanya dependensi production
RUN npm ci --only=production

# Copy hasil build dari Stage 1
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/db.json ./db.json
COPY --from=builder /app/*.csv ./

# Jika ada file konfigurasi Firebase
COPY --from=builder /app/firebase-applet-config.json ./firebase-applet-config.json

# Expose port aplikasi (Hugging Face Spaces membutuhkan port 7860)
EXPOSE 7860

# Jalankan aplikasi Express
CMD ["npm", "run", "start"]
