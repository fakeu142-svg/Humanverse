module.exports = {
  apps: [
    {
      name: 'humanverse-app',
      script: 'server.js',
      cwd: '/app',
      instances: 'max', // Use all available CPU cores
      exec_mode: 'cluster',
      
      // Environment
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        NEXT_TELEMETRY_DISABLED: 1
      },

      // Logging
      log_file: '/app/logs/pm2.log',
      out_file: '/app/logs/pm2-out.log',
      error_file: '/app/logs/pm2-error.log',
      log_type: 'json',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,

      // Performance monitoring
      monitoring: true,
      pmx: true,

      // Auto-restart configuration
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '1G',
      
      // Graceful shutdown
      kill_timeout: 5000,
      listen_timeout: 3000,
      shutdown_with_message: true,

      // Health monitoring
      health_check_grace_period: 3000,
      health_check_fatal_exceptions: true,

      // Source control
      watch: false, // Disable in production
      ignore_watch: [
        'node_modules',
        'logs',
        'uploads',
        '.git'
      ],

      // Advanced PM2 features
      increment_var: 'PORT',
      combine_logs: true,
      force: true,

      // Cron-based restart (daily at 3 AM)
      cron_restart: '0 3 * * *',

      // Environment variables
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        NEXT_TELEMETRY_DISABLED: 1
      }
    },

    // Surveillance Analytics Service
    {
      name: 'surveillance-analytics',
      script: './services/surveillance-analytics/index.js',
      instances: 2,
      exec_mode: 'cluster',
      
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        SERVICE_NAME: 'surveillance-analytics'
      },

      log_file: '/app/logs/surveillance-analytics.log',
      out_file: '/app/logs/surveillance-analytics-out.log',
      error_file: '/app/logs/surveillance-analytics-error.log',

      autorestart: true,
      max_restarts: 5,
      min_uptime: '10s',
      max_memory_restart: '512M',
    },

    // Background Job Processor
    {
      name: 'job-processor',
      script: './services/job-processor/index.js',
      instances: 1,
      exec_mode: 'fork',
      
      env: {
        NODE_ENV: 'production',
        SERVICE_NAME: 'job-processor'
      },

      log_file: '/app/logs/job-processor.log',
      out_file: '/app/logs/job-processor-out.log',
      error_file: '/app/logs/job-processor-error.log',

      autorestart: true,
      max_restarts: 3,
      min_uptime: '30s',
      max_memory_restart: '256M',
      
      // Cron for cleanup jobs
      cron_restart: '0 1 * * *'
    },

    // Message Queue Consumer
    {
      name: 'queue-consumer',
      script: './services/queue-consumer/index.js',
      instances: 2,
      exec_mode: 'fork',
      
      env: {
        NODE_ENV: 'production',
        SERVICE_NAME: 'queue-consumer'
      },

      log_file: '/app/logs/queue-consumer.log',
      out_file: '/app/logs/queue-consumer-out.log',
      error_file: '/app/logs/queue-consumer-error.log',

      autorestart: true,
      max_restarts: 5,
      min_uptime: '10s',
      max_memory_restart: '256M',
      
      // Queue-specific settings
      kill_timeout: 10000, // Longer timeout for queue processing
    },

    // Real-time Surveillance Monitor
    {
      name: 'surveillance-monitor',
      script: './services/surveillance-monitor/index.js',
      instances: 1,
      exec_mode: 'fork',
      
      env: {
        NODE_ENV: 'production',
        SERVICE_NAME: 'surveillance-monitor'
      },

      log_file: '/app/logs/surveillance-monitor.log',
      out_file: '/app/logs/surveillance-monitor-out.log',
      error_file: '/app/logs/surveillance-monitor-error.log',

      autorestart: true,
      max_restarts: 10,
      min_uptime: '5s',
      max_memory_restart: '512M',
      
      // Critical service - immediate restart
      restart_delay: 1000,
    }
  ],

  // Deployment configuration
  deploy: {
    production: {
      user: 'deploy',
      host: ['srv1.humanverse.com', 'srv2.humanverse.com'],
      ref: 'origin/main',
      repo: 'git@github.com:humanverse/platform.git',
      path: '/var/www/humanverse',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npm run build && pm2 reload pm2.config.js --env production',
      'pre-setup': 'sudo mkdir -p /var/www/humanverse && sudo chown deploy:deploy /var/www/humanverse',
      'ssh_options': 'StrictHostKeyChecking=no'
    }
  }
};
