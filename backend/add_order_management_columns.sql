-- Migration script to add Order Management columns to sales table
-- Run this in Supabase SQL Editor

-- Add new columns for order management
ALTER TABLE sales ADD COLUMN IF NOT EXISTS order_status TEXT DEFAULT 'pending';
ALTER TABLE sales ADD COLUMN IF NOT EXISTS shipment_status TEXT DEFAULT 'not_shipped';
ALTER TABLE sales ADD COLUMN IF NOT EXISTS shipment_date DATE;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS dispatch_date DATE;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS delivery_date DATE;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS tracking_number TEXT;

-- Add comments for documentation
COMMENT ON COLUMN sales.order_status IS 'Order status: pending, processing, completed, cancelled';
COMMENT ON COLUMN sales.shipment_status IS 'Shipment status: not_shipped, preparing, shipped, in_transit, delivered';
COMMENT ON COLUMN sales.shipment_date IS 'Date when shipment was prepared';
COMMENT ON COLUMN sales.dispatch_date IS 'Date when order was dispatched';
COMMENT ON COLUMN sales.delivery_date IS 'Date when order was delivered';
COMMENT ON COLUMN sales.tracking_number IS 'Tracking number for shipment';

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_sales_order_status ON sales(order_status);
CREATE INDEX IF NOT EXISTS idx_sales_shipment_status ON sales(shipment_status);
CREATE INDEX IF NOT EXISTS idx_sales_shipment_date ON sales(shipment_date);
CREATE INDEX IF NOT EXISTS idx_sales_delivery_date ON sales(delivery_date);

-- Update existing records with default values
UPDATE sales
SET
    order_status = 'completed',
    shipment_status = 'delivered'
WHERE
    payment_status = 'Paid'
    AND order_status IS NULL;

UPDATE sales
SET
    order_status = 'processing',
    shipment_status = 'not_shipped'
WHERE
    payment_status IN ('Pending', 'Partial')
    AND order_status IS NULL;

-- Verify the changes
SELECT
    'Orders with order_status' as description,
    COUNT(*) as count
FROM sales
WHERE order_status IS NOT NULL
UNION ALL
SELECT
    'Orders with shipment_status' as description,
    COUNT(*) as count
FROM sales
WHERE shipment_status IS NOT NULL;

-- Show sample of updated data
SELECT
    sale_id,
    invoice_no,
    sale_date,
    order_status,
    shipment_status,
    payment_status
FROM sales
LIMIT 10;
