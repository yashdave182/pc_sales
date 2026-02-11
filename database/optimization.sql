-- ==========================================
-- 1. INDEXES (Speed up lookups)
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_sales_sale_date ON public.sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON public.sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON public.payments(payment_date);

-- ==========================================
-- 2. SALES TREND RPC (For Chart)
-- ==========================================
CREATE OR REPLACE FUNCTION get_sales_trend(
    interval_type TEXT, 
    start_date DATE, 
    end_date DATE
) 
RETURNS TABLE (
    period TEXT,
    sales_count BIGINT,
    total_amount NUMERIC,
    total_liters NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        CASE 
            WHEN interval_type = 'daily' THEN to_char(sale_date, 'YYYY-MM-DD')
            WHEN interval_type = 'weekly' THEN to_char(sale_date, 'IYYY-IW')
            WHEN interval_type = 'monthly' THEN to_char(sale_date, 'YYYY-MM')
            ELSE to_char(sale_date, 'YYYY-MM-DD')
        END AS period,
        COUNT(*) AS sales_count,
        COALESCE(SUM(total_amount), 0) AS total_amount,
        COALESCE(SUM(total_liters), 0) AS total_liters
    FROM 
        public.sales
    WHERE 
        sale_date >= start_date AND sale_date <= end_date
    GROUP BY 
        period
    ORDER BY 
        period;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- 3. COLLECTED PAYMENTS RPC (For Dashboard Widget)
-- ==========================================
CREATE OR REPLACE FUNCTION get_collected_payments(
    start_date DATE, 
    end_date DATE
) 
RETURNS NUMERIC AS $$
DECLARE
    total NUMERIC;
BEGIN
    SELECT COALESCE(SUM(amount), 0) INTO total
    FROM public.payments
    WHERE payment_date >= start_date AND payment_date <= end_date;
    
    RETURN total;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- 4. DASHBOARD METRICS RPC (Bundle everything)
-- ==========================================
CREATE OR REPLACE FUNCTION get_dashboard_metrics() 
RETURNS JSON AS $$
DECLARE
    v_total_sales NUMERIC;
    v_total_transactions BIGINT;
    v_pending_amount NUMERIC;
    v_total_customers BIGINT;
    v_active_customers BIGINT;
    v_demo_conversion NUMERIC;
    v_payment_distribution JSON;
BEGIN
    -- 1. Total Sales & Transactions (All Time)
    SELECT COALESCE(SUM(total_amount), 0), COUNT(*)
    INTO v_total_sales, v_total_transactions
    FROM public.sales;

    -- 2. Pending Amount (from Sales that are Pending)
    SELECT COALESCE(SUM(total_amount), 0)
    INTO v_pending_amount
    FROM public.sales
    WHERE payment_status = 'Pending'; 

    -- 3. Customer Stats
    SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'Active')
    INTO v_total_customers, v_active_customers
    FROM public.customers;

    -- 4. Payment Method Distribution
    SELECT json_object_agg(method, amount) INTO v_payment_distribution
    FROM (
        SELECT 
            COALESCE(payment_method, 'Other') as method, 
            SUM(amount) as amount
        FROM public.payments 
        GROUP BY 1
    ) t;

    -- 5. Demo Conversion (Placeholder)
    v_demo_conversion := 0; 

    RETURN json_build_object(
        'total_sales', v_total_sales,
        'total_transactions', v_total_transactions,
        'pending_amount', v_pending_amount,
        'total_customers', v_total_customers,
        'active_customers', v_active_customers,
        'demo_conversion_rate', v_demo_conversion,
        'payment_method_distribution', COALESCE(v_payment_distribution, '{}'::json)
    );
END;
$$ LANGUAGE plpgsql;
