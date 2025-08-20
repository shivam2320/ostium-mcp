#!/bin/bash

# Certificate management script for Let's Encrypt
# This script runs ON the server (not remotely)
# Usage: ./manage-certs.sh [init|renew|status|revoke|test]

# Configuration
DOMAIN="ostium-mcp.osirislabs.xyz"
EMAIL="admin@osirislabs.xyz"
COMPOSE_FILE="compose.yml"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_usage() {
    echo "Usage: $0 [init|renew|status|revoke|test]"
    echo ""
    echo "Commands:"
    echo "  init    - Initialize SSL certificates for the first time"
    echo "  renew   - Manually renew certificates"
    echo "  status  - Check certificate status and expiry"
    echo "  revoke  - Revoke certificates"
    echo "  test    - Test certificate configuration"
}

check_docker_compose() {
    if [ ! -f "$COMPOSE_FILE" ]; then
        echo -e "${RED}❌ compose.yml not found${NC}"
        exit 1
    fi
}

init_certificates() {
    echo -e "${YELLOW}🔐 Initializing SSL certificates...${NC}"
    
    # Ensure directories exist
    mkdir -p certbot/conf certbot/www logs/nginx
    
    # Check if certificates already exist
    if [ -d "certbot/conf/live/$DOMAIN" ]; then
        echo -e "${YELLOW}⚠️  Certificates already exist for $DOMAIN${NC}"
        read -p "Do you want to overwrite them? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "Aborted."
            exit 0
        fi
        
        # Remove existing certificates
        sudo rm -rf "certbot/conf/live/$DOMAIN"
        sudo rm -rf "certbot/conf/archive/$DOMAIN"
        sudo rm -f "certbot/conf/renewal/$DOMAIN.conf"
    fi
    
    # Start services
    echo "Starting required services..."
    docker compose up -d ostium-mcp nginx
    
    # Wait for services to be ready
    sleep 10
    
    # Request certificate
    echo "Requesting certificate from Let's Encrypt..."
    docker compose run --rm certbot certonly \
        --webroot \
        --webroot-path=/var/www/certbot \
        --email "$EMAIL" \
        --agree-tos \
        --no-eff-email \
        --force-renewal \
        -d "$DOMAIN"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Certificate obtained successfully!${NC}"
        echo "Restarting nginx to use new certificates..."
        docker compose restart nginx
    else
        echo -e "${RED}❌ Failed to obtain certificate${NC}"
        exit 1
    fi
}

renew_certificates() {
    echo -e "${YELLOW}🔄 Renewing SSL certificates...${NC}"
    
    docker compose run --rm certbot renew
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Certificate renewal completed${NC}"
        echo "Reloading nginx configuration..."
        docker compose exec nginx nginx -s reload
    else
        echo -e "${RED}❌ Certificate renewal failed${NC}"
        exit 1
    fi
}

check_status() {
    echo -e "${YELLOW}📋 Certificate Status:${NC}"
    echo ""
    
    # Check if certificates exist
    if [ ! -d "certbot/conf/live/$DOMAIN" ]; then
        echo -e "${RED}❌ No certificates found for $DOMAIN${NC}"
        return 1
    fi
    
    # Show certificate information
    docker compose run --rm certbot certificates
    
    echo ""
    echo -e "${YELLOW}📅 Certificate Expiry Information:${NC}"
    
    # Get certificate expiry date
    CERT_FILE="certbot/conf/live/$DOMAIN/fullchain.pem"
    if [ -f "$CERT_FILE" ]; then
        EXPIRY=$(openssl x509 -enddate -noout -in "$CERT_FILE" | cut -d= -f2)
        EXPIRY_EPOCH=$(date -d "$EXPIRY" +%s)
        CURRENT_EPOCH=$(date +%s)
        DAYS_UNTIL_EXPIRY=$(( (EXPIRY_EPOCH - CURRENT_EPOCH) / 86400 ))
        
        echo "Certificate expires: $EXPIRY"
        echo "Days until expiry: $DAYS_UNTIL_EXPIRY"
        
        if [ $DAYS_UNTIL_EXPIRY -lt 30 ]; then
            echo -e "${YELLOW}⚠️  Certificate expires in less than 30 days${NC}"
        elif [ $DAYS_UNTIL_EXPIRY -lt 7 ]; then
            echo -e "${RED}❌ Certificate expires in less than 7 days!${NC}"
        else
            echo -e "${GREEN}✅ Certificate is valid${NC}"
        fi
    fi
}

revoke_certificates() {
    echo -e "${YELLOW}🗑️  Revoking SSL certificates...${NC}"
    
    read -p "Are you sure you want to revoke certificates for $DOMAIN? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 0
    fi
    
    docker compose run --rm certbot revoke \
        --cert-path "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" \
        --reason cessationofoperation
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Certificate revoked successfully${NC}"
        
        # Remove certificate files
        sudo rm -rf "certbot/conf/live/$DOMAIN"
        sudo rm -rf "certbot/conf/archive/$DOMAIN"
        sudo rm -f "certbot/conf/renewal/$DOMAIN.conf"
    else
        echo -e "${RED}❌ Certificate revocation failed${NC}"
        exit 1
    fi
}

test_configuration() {
    echo -e "${YELLOW}🧪 Testing SSL configuration...${NC}"
    
    # Test if containers are running
    echo "Checking if containers are running..."
    if ! docker compose ps | grep -q "Up"; then
        echo -e "${RED}❌ Containers are not running. Start them first with: docker compose up -d${NC}"
        return 1
    fi
    
    # Test HTTP connection locally
    echo "Testing HTTP connection..."
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost" --connect-timeout 10)
    if [ "$HTTP_STATUS" = "200" ] || [ "$HTTP_STATUS" = "301" ] || [ "$HTTP_STATUS" = "302" ]; then
        echo -e "${GREEN}✅ HTTP connection working (Status: $HTTP_STATUS)${NC}"
    else
        echo -e "${YELLOW}⚠️  HTTP connection returned status: $HTTP_STATUS${NC}"
    fi
    
    # Test HTTPS connection if certificates exist
    if [ -f "certbot/conf/live/$DOMAIN/fullchain.pem" ]; then
        echo "Testing HTTPS connection..."
        HTTPS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://localhost" --connect-timeout 10 --insecure)
        if [ "$HTTPS_STATUS" = "200" ] || [ "$HTTPS_STATUS" = "301" ] || [ "$HTTPS_STATUS" = "302" ]; then
            echo -e "${GREEN}✅ HTTPS connection working (Status: $HTTPS_STATUS)${NC}"
        else
            echo -e "${YELLOW}⚠️  HTTPS connection returned status: $HTTPS_STATUS${NC}"
        fi
        
        # Check certificate expiry
        echo "Checking certificate expiry..."
        CERT_FILE="certbot/conf/live/$DOMAIN/fullchain.pem"
        if openssl x509 -checkend 0 -noout -in "$CERT_FILE" >/dev/null 2>&1; then
            echo -e "${GREEN}✅ Certificate is not expired${NC}"
        else
            echo -e "${RED}❌ Certificate is expired${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  No SSL certificates found${NC}"
        echo "Run './manage-certs.sh init' to create certificates"
    fi
    
    # Test nginx configuration
    echo "Testing nginx configuration..."
    if docker compose exec nginx nginx -t >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Nginx configuration is valid${NC}"
    else
        echo -e "${RED}❌ Nginx configuration has errors${NC}"
        docker compose exec nginx nginx -t
    fi
}

# Main script logic
check_docker_compose

case "${1:-}" in
    init)
        init_certificates
        ;;
    renew)
        renew_certificates
        ;;
    status)
        check_status
        ;;
    revoke)
        revoke_certificates
        ;;
    test)
        test_configuration
        ;;
    *)
        print_usage
        exit 1
        ;;
esac