-- Conversion Analytics Functions and Views
-- Track user upgrades and revenue metrics

-- Create analytics table for tracking conversion events
CREATE TABLE IF NOT EXISTS conversion_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL, -- 'signup', 'upgrade', 'downgrade', 'churn'
    from_tier TEXT,
    to_tier TEXT,
    revenue_impact DECIMAL(10, 2),
    created_at TIMESTAMP DEFAULT NOW(),
    metadata JSONB
);

CREATE INDEX idx_conversion_events_user ON conversion_events(user_id);
CREATE INDEX idx_conversion_events_type ON conversion_events(event_type);
CREATE INDEX idx_conversion_events_created ON conversion_events(created_at);

-- Function to get conversion metrics
CREATE OR REPLACE FUNCTION get_conversion_metrics(
    p_time_range TEXT DEFAULT '30d'
)
RETURNS TABLE(
    total_users BIGINT,
    free_users BIGINT,
    paid_users BIGINT,
    starter_users BIGINT,
    pro_users BIGINT,
    business_users BIGINT,
    enterprise_users BIGINT,
    total_chats BIGINT,
    chat_usage_rate NUMERIC,
    daily_stats JSONB
) AS $$
DECLARE
    v_interval INTERVAL;
BEGIN
    -- Parse time range
    v_interval := CASE p_time_range
        WHEN '7d' THEN INTERVAL '7 days'
        WHEN '30d' THEN INTERVAL '30 days'
        WHEN '90d' THEN INTERVAL '90 days'
        ELSE INTERVAL '30 days'
    END;

    RETURN QUERY
    WITH user_stats AS (
        SELECT
            COUNT(*) AS total,
            COUNT(*) FILTER (WHERE up.tier = 'free' OR up.tier IS NULL) AS free,
            COUNT(*) FILTER (WHERE up.tier != 'free' AND up.tier IS NOT NULL) AS paid,
            COUNT(*) FILTER (WHERE up.tier = 'starter') AS starter,
            COUNT(*) FILTER (WHERE up.tier = 'pro') AS pro,
            COUNT(*) FILTER (WHERE up.tier = 'business') AS business,
            COUNT(*) FILTER (WHERE up.tier = 'enterprise') AS enterprise
        FROM auth.users u
        LEFT JOIN user_profiles up ON u.id = up.user_id
        WHERE u.created_at >= NOW() - v_interval
    ),
    chat_stats AS (
        SELECT
            COUNT(DISTINCT user_id) AS active_chat_users,
            COUNT(*) AS total_messages
        FROM ai_chat_messages
        WHERE created_at >= NOW() - v_interval
    ),
    daily_breakdown AS (
        SELECT
            jsonb_agg(
                jsonb_build_object(
                    'date', date,
                    'signups', signups,
                    'upgrades', upgrades,
                    'chats', chats,
                    'revenue', revenue
                ) ORDER BY date
            ) AS stats
        FROM (
            SELECT
                DATE(d.date) AS date,
                COUNT(DISTINCT u.id) FILTER (WHERE DATE(u.created_at) = DATE(d.date)) AS signups,
                COUNT(DISTINCT ce.user_id) FILTER (WHERE ce.event_type = 'upgrade' AND DATE(ce.created_at) = DATE(d.date)) AS upgrades,
                COUNT(DISTINCT acm.id) FILTER (WHERE DATE(acm.created_at) = DATE(d.date)) AS chats,
                COALESCE(SUM(ce.revenue_impact) FILTER (WHERE DATE(ce.created_at) = DATE(d.date)), 0) AS revenue
            FROM generate_series(
                NOW() - v_interval,
                NOW(),
                INTERVAL '1 day'
            ) AS d(date)
            LEFT JOIN auth.users u ON DATE(u.created_at) = DATE(d.date)
            LEFT JOIN conversion_events ce ON DATE(ce.created_at) = DATE(d.date)
            LEFT JOIN ai_chat_messages acm ON DATE(acm.created_at) = DATE(d.date)
            GROUP BY DATE(d.date)
        ) daily_data
    )
    SELECT
        us.total,
        us.free,
        us.paid,
        us.starter,
        us.pro,
        us.business,
        us.enterprise,
        cs.total_messages,
        CASE
            WHEN us.total > 0 THEN (cs.active_chat_users::NUMERIC / us.total::NUMERIC) * 100
            ELSE 0
        END AS chat_usage_rate,
        db.stats
    FROM user_stats us
    CROSS JOIN chat_stats cs
    CROSS JOIN daily_breakdown db;
END;
$$ LANGUAGE plpgsql;

-- Trigger to track conversion events
CREATE OR REPLACE FUNCTION track_tier_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Only track if tier actually changed
    IF OLD.tier IS DISTINCT FROM NEW.tier THEN
        INSERT INTO conversion_events (
            user_id,
            event_type,
            from_tier,
            to_tier,
            revenue_impact,
            metadata
        ) VALUES (
            NEW.user_id,
            CASE
                WHEN OLD.tier = 'free' AND NEW.tier != 'free' THEN 'upgrade'
                WHEN OLD.tier != 'free' AND NEW.tier = 'free' THEN 'downgrade'
                WHEN OLD.tier != 'free' AND NEW.tier != 'free' THEN 'tier_change'
                ELSE 'unknown'
            END,
            OLD.tier,
            NEW.tier,
            CASE NEW.tier
                WHEN 'starter' THEN 5000
                WHEN 'pro' THEN 10000
                WHEN 'business' THEN 20000
                WHEN 'enterprise' THEN 50000
                ELSE 0
            END - CASE OLD.tier
                WHEN 'starter' THEN 5000
                WHEN 'pro' THEN 10000
                WHEN 'business' THEN 20000
                WHEN 'enterprise' THEN 50000
                ELSE 0
            END,
            jsonb_build_object(
                'old_chat_limit', OLD.ai_chat_limit,
                'new_chat_limit', NEW.ai_chat_limit,
                'timestamp', NOW()
            )
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on user_profiles
CREATE TRIGGER track_tier_changes
AFTER UPDATE ON user_profiles
FOR EACH ROW
EXECUTE FUNCTION track_tier_change();

-- View for real-time revenue tracking
CREATE OR REPLACE VIEW revenue_summary AS
SELECT
    DATE_TRUNC('month', created_at) AS month,
    COUNT(*) FILTER (WHERE event_type = 'signup') AS new_signups,
    COUNT(*) FILTER (WHERE event_type = 'upgrade') AS upgrades,
    COUNT(*) FILTER (WHERE event_type = 'downgrade') AS downgrades,
    SUM(revenue_impact) AS net_revenue_change,
    COUNT(DISTINCT user_id) AS affected_users
FROM conversion_events
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month DESC;

-- View for cohort analysis
CREATE OR REPLACE VIEW cohort_retention AS
WITH user_cohorts AS (
    SELECT
        user_id,
        DATE_TRUNC('month', MIN(created_at)) AS cohort_month,
        MIN(created_at) AS first_seen
    FROM ai_chat_messages
    GROUP BY user_id
)
SELECT
    cohort_month,
    COUNT(DISTINCT user_id) AS cohort_size,
    COUNT(DISTINCT user_id) FILTER (
        WHERE EXISTS (
            SELECT 1 FROM ai_chat_messages m
            WHERE m.user_id = uc.user_id
            AND m.created_at >= uc.first_seen + INTERVAL '30 days'
        )
    ) AS retained_30d,
    COUNT(DISTINCT user_id) FILTER (
        WHERE EXISTS (
            SELECT 1 FROM user_profiles up
            WHERE up.user_id = uc.user_id
            AND up.tier != 'free'
        )
    ) AS converted_to_paid
FROM user_cohorts uc
GROUP BY cohort_month
ORDER BY cohort_month DESC;

-- Function to get upgrade recommendations
CREATE OR REPLACE FUNCTION get_upgrade_candidates()
RETURNS TABLE(
    user_id UUID,
    email TEXT,
    current_tier TEXT,
    chats_used INTEGER,
    chat_limit INTEGER,
    usage_percentage NUMERIC,
    days_since_signup INTEGER,
    recommended_tier TEXT,
    recommendation_reason TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        u.id AS user_id,
        u.email,
        COALESCE(up.tier, 'free') AS current_tier,
        up.ai_chats_this_month AS chats_used,
        up.ai_chat_limit AS chat_limit,
        CASE
            WHEN up.ai_chat_limit > 0 THEN
                (up.ai_chats_this_month::NUMERIC / up.ai_chat_limit::NUMERIC) * 100
            ELSE 0
        END AS usage_percentage,
        EXTRACT(DAY FROM NOW() - u.created_at)::INTEGER AS days_since_signup,
        CASE
            WHEN up.ai_chats_this_month >= up.ai_chat_limit * 0.8 AND up.tier = 'free' THEN 'starter'
            WHEN up.ai_chats_this_month >= up.ai_chat_limit * 0.8 AND up.tier = 'starter' THEN 'pro'
            WHEN up.ai_chats_this_month >= up.ai_chat_limit * 0.8 AND up.tier = 'pro' THEN 'business'
            ELSE up.tier
        END AS recommended_tier,
        CASE
            WHEN up.ai_chats_this_month >= up.ai_chat_limit * 0.8 THEN
                'User is at ' || ROUND((up.ai_chats_this_month::NUMERIC / up.ai_chat_limit::NUMERIC) * 100) || '% of chat limit'
            WHEN up.products_count >= up.product_limit * 0.8 THEN
                'User is at ' || ROUND((up.products_count::NUMERIC / up.product_limit::NUMERIC) * 100) || '% of product limit'
            ELSE 'Active user with growth potential'
        END AS recommendation_reason
    FROM auth.users u
    LEFT JOIN user_profiles up ON u.id = up.user_id
    WHERE
        up.ai_chats_this_month > 5 -- Active users only
        AND (up.tier = 'free' OR up.tier IS NULL OR up.ai_chats_this_month >= up.ai_chat_limit * 0.5)
    ORDER BY usage_percentage DESC;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT SELECT ON conversion_events TO authenticated;
GRANT SELECT ON revenue_summary TO authenticated;
GRANT SELECT ON cohort_retention TO authenticated;
GRANT EXECUTE ON FUNCTION get_conversion_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION get_upgrade_candidates TO authenticated;