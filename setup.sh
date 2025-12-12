#!/bin/bash
set -e

# Docker Master Class - Setup Script for WSL2
# Installs Docker and Docker Compose for the Docker tutorial lessons

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_success() { echo -e "${GREEN}✓ $1${NC}"; }
print_error() { echo -e "${RED}✗ $1${NC}"; }
print_info() { echo -e "${BLUE}→ $1${NC}"; }
print_warning() { echo -e "${YELLOW}! $1${NC}"; }

check_wsl2() {
    if grep -qi microsoft /proc/version 2>/dev/null; then
        print_success "Running in WSL2 environment"
        return 0
    else
        print_warning "Not running in WSL2 - this script is designed for WSL2/Ubuntu"
        print_info "Continuing anyway (Ubuntu/Debian compatible)..."
        return 0
    fi
}

check_docker() {
    if command -v docker &> /dev/null; then
        local version=$(docker --version 2>/dev/null || echo "unknown")
        print_success "Docker is already installed: $version"
        return 0
    else
        return 1
    fi
}

check_docker_running() {
    if docker ps &> /dev/null; then
        print_success "Docker daemon is already running"
        return 0
    else
        return 1
    fi
}

check_docker_compose() {
    if docker compose version &> /dev/null; then
        local version=$(docker compose version 2>/dev/null || echo "unknown")
        print_success "Docker Compose is available: $version"
        return 0
    else
        return 1
    fi
}

install_docker() {
    print_info "Installing Docker..."

    # Remove old versions if present
    print_info "Removing old Docker versions (if any)..."
    sudo apt-get remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true

    # Install prerequisites
    print_info "Installing prerequisites..."
    sudo apt-get update
    sudo apt-get install -y ca-certificates curl gnupg

    # Add Docker's official GPG key
    print_info "Adding Docker GPG key..."
    sudo install -m 0755 -d /etc/apt/keyrings
    if [ -f /etc/apt/keyrings/docker.gpg ]; then
        sudo rm /etc/apt/keyrings/docker.gpg
    fi
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    sudo chmod a+r /etc/apt/keyrings/docker.gpg

    # Add Docker repository
    print_info "Adding Docker repository..."
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

    # Install Docker packages
    print_info "Installing Docker packages..."
    sudo apt-get update
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

    print_success "Docker installed successfully"
}

start_docker_service() {
    if check_docker_running; then
        return 0
    fi
    print_info "Starting Docker service..."
    sudo service docker start
    sleep 2
    if docker ps &>/dev/null; then
        print_success "Docker service is running"
    else
        print_warning "Docker service may not be running. Try: sudo service docker start"
    fi
}

add_user_to_docker_group() {
    if groups $USER | grep -q '\bdocker\b'; then
        print_success "User '$USER' is already in docker group"
    else
        print_info "Adding user '$USER' to docker group..."
        sudo usermod -aG docker $USER
        print_success "User added to docker group"
        print_warning "You may need to log out and back in, or run 'newgrp docker' for this to take effect"
    fi
}

verify_installation() {
    echo ""
    print_info "Verifying installation..."
    echo ""

    echo "Docker version:"
    docker --version
    echo ""

    echo "Docker Compose version:"
    docker compose version
    echo ""

    print_info "Running hello-world container test..."
    if docker run --rm hello-world &>/dev/null; then
        print_success "Docker is working correctly!"
    else
        print_error "Docker test failed. Try running: docker run hello-world"
    fi
}

print_next_steps() {
    echo ""
    echo "=========================================="
    echo -e "${GREEN}Setup Complete!${NC}"
    echo "=========================================="
    echo ""
    echo "Next steps to start the Docker lessons:"
    echo ""
    echo "  Step 1 - Container Basics (15 min):"
    echo "    cd step-1-container-basics && cat README.md"
    echo ""
    echo "  Step 2 - Build Your First Image (15 min):"
    echo "    cd step-2-build-your-first-image && cat README.md"
    echo ""
    echo "  Step 3 - Manual Networking (20 min):"
    echo "    cd step-3-manual-networking && cat README.md"
    echo ""
    echo "  Step 4 - Docker Compose (20 min):"
    echo "    cd step-4-docker-compose && docker compose up -d --build"
    echo ""
    echo "  Step 5 - Persistence with PostgreSQL (25 min):"
    echo "    cd step-5-persistence && docker compose up -d --build"
    echo ""
    echo "Quick reference: cat cheat-sheet.md"
    echo ""
}

main() {
    echo ""
    echo "=========================================="
    echo "Docker Master Class - Setup Script"
    echo "=========================================="
    echo ""

    check_wsl2

    if check_docker; then
        print_info "Docker already installed, skipping installation"
    else
        install_docker
    fi

    start_docker_service
    add_user_to_docker_group

    if ! check_docker_compose; then
        print_error "Docker Compose not found. It should be installed with docker-compose-plugin"
        exit 1
    fi

    verify_installation
    print_next_steps
}

main "$@"
