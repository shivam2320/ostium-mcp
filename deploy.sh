#!/bin/bash

# Configuration
SERVER_USER="ostium"
SERVER_IP="34.93.2.1"
SSH_KEY_PATH="~/.ssh/deploy_osiris_01"
SERVER_PATH="/home/ostium/app"
IMAGE_NAME="ostium-mcp"
IMAGE_TAG="latest"

echo "🚀 Starting local build and deployment..."

# Build image locally for target platform
echo "🔨 Building Docker image locally..."
docker build --platform linux/amd64 -t "${IMAGE_NAME}:${IMAGE_TAG}" .

# Log image size
echo "📊 Image size information:"
docker images "${IMAGE_NAME}:${IMAGE_TAG}" --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"

# Save image to tar file
echo "💾 Saving image to tar file..."
docker save "${IMAGE_NAME}:${IMAGE_TAG}" | gzip > "${IMAGE_NAME}.tar.gz"

# Log tar file size
TAR_SIZE=$(du -h "${IMAGE_NAME}.tar.gz" | cut -f1)
echo "📦 Compressed image size: ${TAR_SIZE}"

# Check required files exist
echo "🔍 Checking required files..."
required_files=("compose.yml" "nginx/nginx.conf" ".env")
for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        echo "❌ Missing file: $file"
        exit 1
    fi
done

# Transfer image and files to server
echo "📤 Transferring files to server..."
rsync -avz --progress \
  -e "ssh -i $SSH_KEY_PATH" \
  "${IMAGE_NAME}.tar.gz" \
  compose.yml \
  nginx/nginx.conf \
  nginx/ssl/ \
  nginx/conf.d/ \
  .env \
  $SERVER_USER@$SERVER_IP:$SERVER_PATH/

# SSH into server and deploy
echo "🚀 Deploying on server..."
ssh -i $SSH_KEY_PATH $SERVER_USER@$SERVER_IP << EOF
cd $SERVER_PATH

echo "Stopping existing containers..."
docker compose down

echo "Cleaning nginx directory conflicts..."
sudo rm -rf nginx/nginx.conf nginx/ssl nginx/conf.d
mkdir -p nginx/ssl nginx/conf.d

echo "Loading new image..."
docker load < "${IMAGE_NAME}.tar.gz"
EOF

# Re-sync nginx files after cleanup
echo "📤 Re-syncing nginx files..."
rsync -avz -e "ssh -i $SSH_KEY_PATH" \
  nginx/ \
  $SERVER_USER@$SERVER_IP:$SERVER_PATH/nginx/

# Continue deployment
ssh -i $SSH_KEY_PATH $SERVER_USER@$SERVER_IP << EOF
cd $SERVER_PATH

echo "Starting containers..."
docker compose up -d

echo "Cleaning up..."
rm "${IMAGE_NAME}.tar.gz"

echo "Checking container status..."
docker compose ps
EOF

# Cleanup local tar file
rm "${IMAGE_NAME}.tar.gz"

echo "✅ Deployment complete!"
echo "🌐 Your application should be running at: http://$SERVER_IP"
