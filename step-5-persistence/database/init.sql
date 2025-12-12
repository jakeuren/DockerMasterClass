-- Database initialization script for microservices demo
-- This runs automatically when PostgreSQL container first starts

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::varchar(36),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inventory table
CREATE TABLE IF NOT EXISTS inventory (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::varchar(36),
    user_id VARCHAR(36) NOT NULL REFERENCES users(id),
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Order items table
CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id VARCHAR(36) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    item_id VARCHAR(36) NOT NULL REFERENCES inventory(id),
    quantity INTEGER NOT NULL DEFAULT 1
);

-- Seed data: Users
INSERT INTO users (id, name, email) VALUES
    ('1', 'Alice', 'alice@example.com'),
    ('2', 'Bob', 'bob@example.com'),
    ('3', 'Charlie', 'charlie@example.com')
ON CONFLICT (id) DO NOTHING;

-- Seed data: Inventory
INSERT INTO inventory (id, name, quantity, price) VALUES
    ('ITEM001', 'Docker Handbook', 50, 29.99),
    ('ITEM002', 'Container Stickers', 200, 4.99),
    ('ITEM003', 'Kubernetes Mug', 25, 14.99),
    ('ITEM004', 'DevOps T-Shirt', 75, 24.99)
ON CONFLICT (id) DO NOTHING;

-- Seed data: Sample order
INSERT INTO orders (id, user_id, status, created_at) VALUES
    ('ORD001', '1', 'completed', '2025-01-15 10:30:00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO order_items (order_id, item_id, quantity) VALUES
    ('ORD001', 'ITEM001', 2)
ON CONFLICT DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_inventory_quantity ON inventory(quantity);
