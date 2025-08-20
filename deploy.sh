#!/bin/bash

# Configuration
SERVER_USER="ostium"
SERVER_IP="34.93.2.1"
SSH_KEY_PATH="~/.ssh/deploy_osiris_01"
SERVER_PATH="/home/ostium/app"
IMAGE_NAME="ostium-mcp"
IMAGE_TAG="latest"
DOMAIN="ostium-mcp.osirislabs.xyz"
EMAIL="admin@osirislabs.xyz"

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
  nginx/conf.d/ \
  .env \
  manage-certs.sh \
  $SERVER_USER@$SERVER_IP:$SERVER_PATH/

# SSH into server and deploy
echo "🚀 Deploying on server..."
ssh -i $SSH_KEY_PATH $SERVER_USER@$SERVER_IP << EOF
cd $SERVER_PATH

echo "Stopping existing containers..."
docker compose down

echo "Creating necessary directories..."
mkdir -p nginx/conf.d certbot/conf certbot/www logs/nginx

# Make manage-certs.sh executable if it exists
if [ -f "manage-certs.sh" ]; then
    chmod +x manage-certs.sh
    echo "✅ Made manage-certs.sh executable"
fi

echo "Loading new image..."
docker load < "${IMAGE_NAME}.tar.gz"

echo "Checking if SSL certificates exist..."
if [ ! -f "certbot/conf/live/$DOMAIN/fullchain.pem" ]; then
    echo "🔐 SSL certificates not found. Setting up initial certificates..."
    
    # Start nginx with HTTP-only config for initial certificate
    echo "Starting nginx for initial certificate acquisition..."
    
    # Create temporary nginx config that only serves HTTP
    cat > nginx/nginx_temp.conf << 'NGINX_EOF'
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    upstream ostium-mcp {
        server ostium-mcp:3000;
    }

    server {
        listen 80;
        server_name $DOMAIN;

        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }

        location / {
            proxy_pass http://ostium-mcp;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
        }
    }
}
NGINX_EOF

    # Start services with temporary config
    docker compose up -d --force-recreate ostium-mcp
    
    # Use temporary nginx config
    cp nginx/nginx_temp.conf nginx/nginx.conf
    docker compose up -d --force-recreate nginx certbot
    
    # Wait for nginx to be ready
    sleep 10
    
    # Get initial certificates
    echo "Requesting SSL certificate from Let's Encrypt..."
    docker compose exec -T certbot certbot certonly \
        --webroot \
        --webroot-path=/var/www/certbot \
        --email $EMAIL \
        --agree-tos \
        --no-eff-email \
        -d $DOMAIN
    
    if [ \$? -eq 0 ]; then
        echo "✅ SSL certificate obtained successfully!"
        # Restore full nginx config
        docker compose down nginx
    else
        echo "❌ Failed to obtain SSL certificate"
        exit 1
    fi
else
    echo "✅ SSL certificates found, proceeding with deployment..."
fi

echo "Starting containers with full configuration..."
EOF

# Re-sync the full nginx config
echo "📤 Updating nginx configuration..."
rsync -avz -e "ssh -i $SSH_KEY_PATH" \
  nginx/nginx.conf \
  $SERVER_USER@$SERVER_IP:$SERVER_PATH/nginx/

# Continue deployment with full config
ssh -i $SSH_KEY_PATH $SERVER_USER@$SERVER_IP << EOF
cd $SERVER_PATH

# Start all services
docker compose up -d --force-recreate

echo "Cleaning up..."
rm "${IMAGE_NAME}.tar.gz"
rm -f nginx/nginx_temp.conf

echo "Checking container status..."
docker compose ps

echo "Testing SSL certificate..."
if docker compose exec -T certbot certbot certificates | grep -q "$DOMAIN"; then
    echo "✅ SSL certificate is active"
    docker compose exec -T certbot certbot certificates | grep -A 10 "$DOMAIN"
else
    echo "⚠️  SSL certificate check failed"
fi

echo "Setting up automatic renewal..."
# Add cron job for certificate renewal if it doesn't exist
(crontab -l 2>/dev/null | grep -v "certbot renew"; echo "0 2 * * 0 cd $SERVER_PATH && docker compose exec -T certbot certbot renew --quiet && docker compose exec -T nginx nginx -s reload") | crontab -

EOF

# Cleanup local tar file
rm "${IMAGE_NAME}.tar.gz"

echo "✅ Deployment complete!"
echo "🌐 Your application should be running at: https://$DOMAIN"
echo "🔐 SSL certificate is managed by Let's Encrypt and will auto-renew"

# Test the deployment
echo "🧪 Testing deployment..."
if curl -s -o /dev/null -w "%{http_code}" "https://$DOMAIN" | grep -q "200\|301\|302"; then
    echo "✅ Deployment is responding correctly"
else
    echo "⚠️  Deployment test failed - please check manually"
fi