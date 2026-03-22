-- Create AI Response Cache Table for 40% cost reduction
-- This will cache common queries to avoid repeated API calls

CREATE TABLE IF NOT EXISTS ai_response_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    query_hash TEXT UNIQUE NOT NULL, -- MD5 hash of the normalized query
    query_text TEXT NOT NULL, -- Original query for reference
    normalized_query TEXT NOT NULL, -- Normalized version for better matching
    response TEXT NOT NULL, -- Cached AI response
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    product_context JSONB, -- Store relevant product info if query is product-related
    hit_count INTEGER DEFAULT 1,
    last_accessed TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '7 days'), -- 7-day cache
    is_active BOOLEAN DEFAULT true
);

-- Indexes for fast lookups
CREATE INDEX idx_cache_hash ON ai_response_cache(query_hash);
CREATE INDEX idx_cache_store ON ai_response_cache(store_id);
CREATE INDEX idx_cache_expires ON ai_response_cache(expires_at);
CREATE INDEX idx_cache_hits ON ai_response_cache(hit_count DESC);
CREATE INDEX idx_cache_accessed ON ai_response_cache(last_accessed DESC);

-- Function to normalize queries for better cache hits
CREATE OR REPLACE FUNCTION normalize_query(query_text TEXT)
RETURNS TEXT AS $$
BEGIN
    -- Convert to lowercase, trim whitespace, remove punctuation at end
    RETURN LOWER(
        REGEXP_REPLACE(
            REGEXP_REPLACE(
                TRIM(query_text),
                '[?.!]+$', '' -- Remove trailing punctuation
            ),
            '\s+', ' ', 'g' -- Normalize whitespace
        )
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get cached response
CREATE OR REPLACE FUNCTION get_cached_response(
    p_query TEXT,
    p_store_id UUID DEFAULT NULL
)
RETURNS TABLE(
    response TEXT,
    cache_hit BOOLEAN
) AS $$
DECLARE
    v_normalized TEXT;
    v_hash TEXT;
    v_response TEXT;
BEGIN
    -- Normalize the query
    v_normalized := normalize_query(p_query);
    v_hash := MD5(v_normalized || COALESCE(p_store_id::TEXT, ''));

    -- Try to get cached response
    SELECT
        c.response INTO v_response
    FROM ai_response_cache c
    WHERE
        c.query_hash = v_hash
        AND c.is_active = true
        AND c.expires_at > NOW()
        AND (c.store_id = p_store_id OR (c.store_id IS NULL AND p_store_id IS NULL))
    LIMIT 1;

    IF v_response IS NOT NULL THEN
        -- Update hit count and last accessed
        UPDATE ai_response_cache
        SET
            hit_count = hit_count + 1,
            last_accessed = NOW()
        WHERE query_hash = v_hash;

        RETURN QUERY SELECT v_response, true;
    ELSE
        RETURN QUERY SELECT NULL::TEXT, false;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to save response to cache
CREATE OR REPLACE FUNCTION cache_ai_response(
    p_query TEXT,
    p_response TEXT,
    p_store_id UUID DEFAULT NULL,
    p_product_context JSONB DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
    v_normalized TEXT;
    v_hash TEXT;
BEGIN
    v_normalized := normalize_query(p_query);
    v_hash := MD5(v_normalized || COALESCE(p_store_id::TEXT, ''));

    INSERT INTO ai_response_cache (
        query_hash,
        query_text,
        normalized_query,
        response,
        store_id,
        product_context
    ) VALUES (
        v_hash,
        p_query,
        v_normalized,
        p_response,
        p_store_id,
        p_product_context
    )
    ON CONFLICT (query_hash)
    DO UPDATE SET
        response = EXCLUDED.response,
        hit_count = ai_response_cache.hit_count + 1,
        last_accessed = NOW(),
        expires_at = NOW() + INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- Common queries to pre-cache (run after deployment)
-- These are based on typical e-commerce queries
INSERT INTO ai_response_cache (query_hash, query_text, normalized_query, response, product_context)
VALUES
    (MD5(normalize_query('do you deliver')),
     'Do you deliver?',
     normalize_query('Do you deliver?'),
     'Yes, we offer delivery services! Delivery is available within Lagos, Nigeria. Delivery fees and timeframes vary based on your location. You can see the exact delivery cost at checkout.',
     '{"type": "delivery_info"}'::JSONB),

    (MD5(normalize_query('what are your delivery options')),
     'What are your delivery options?',
     normalize_query('What are your delivery options?'),
     'We offer several delivery options:\n\n1. **Standard Delivery** (3-5 business days)\n2. **Express Delivery** (1-2 business days)\n3. **Same Day Delivery** (for orders before 12pm, Lagos only)\n\nDelivery fees vary by location and order size.',
     '{"type": "delivery_info"}'::JSONB),

    (MD5(normalize_query('how do i pay')),
     'How do I pay?',
     normalize_query('How do I pay?'),
     'We accept multiple payment methods for your convenience:\n\n• **Bank Transfer**\n• **Card Payment** (Visa, Mastercard, Verve)\n• **Cash on Delivery** (Lagos only)\n• **Mobile Money**\n\nAll payments are secure and encrypted.',
     '{"type": "payment_info"}'::JSONB),

    (MD5(normalize_query('do you have this in stock')),
     'Do you have this in stock?',
     normalize_query('Do you have this in stock?'),
     'I can check our inventory for you! Could you please specify which product you''re interested in? You can browse our available products on the store page, where stock levels are displayed for each item.',
     '{"type": "stock_inquiry"}'::JSONB),

    (MD5(normalize_query('what is your return policy')),
     'What is your return policy?',
     normalize_query('What is your return policy?'),
     'We offer a 7-day return policy for most items. Products must be:\n\n• Unused and in original condition\n• In original packaging\n• With receipt or proof of purchase\n\nSome items like perishables or customized products may not be eligible for returns.',
     '{"type": "return_policy"}'::JSONB)
ON CONFLICT (query_hash) DO NOTHING;

-- Cleanup job for expired cache entries
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS VOID AS $$
BEGIN
    DELETE FROM ai_response_cache
    WHERE expires_at < NOW() OR is_active = false;
END;
$$ LANGUAGE plpgsql;

-- Analytics view for cache performance
CREATE OR REPLACE VIEW cache_performance AS
SELECT
    COUNT(*) as total_cached,
    SUM(hit_count) as total_hits,
    AVG(hit_count) as avg_hits_per_query,
    COUNT(*) FILTER (WHERE hit_count > 5) as popular_queries,
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as new_entries_24h,
    SUM(hit_count) FILTER (WHERE last_accessed > NOW() - INTERVAL '24 hours') as hits_24h
FROM ai_response_cache
WHERE is_active = true;