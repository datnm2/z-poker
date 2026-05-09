// PM2 process config for the ZPoker NestJS API on the VPS.
// Lives at the repo root and is committed. Runs only the `api` workspace
// of this yarn monorepo; the `web` workspace is not deployed here.
//
// Usage on VPS (as the `deploy` user, from /var/www/zpoker):
//   pm2 start ecosystem.config.js
//   pm2 save                                     # persist for systemd resurrect
//   pm2 reload zpoker-backend --update-env       # zero-downtime reload
module.exports = {
  apps: [
    {
      name: 'zpoker-backend',
      // Note: dist/src/main.js (not dist/main.js) because tsconfig includes both
      // src/ and migrations/ at the same level, so TS preserves the src/ subpath.
      script: 'dist/src/main.js',
      // cwd at apps/api so .env beside it is found by NestJS ConfigModule
      // and TypeORM data-source.ts (which loads ../../.env relative to dist/config).
      cwd: '/var/www/zpoker/apps/api',
      instances: 1,
      exec_mode: 'fork',

      // Heap cap. 400MB leaves room for system + Caddy + buffer on a 1GB VPS.
      // Tune up only after observing actual usage; SSE latency degrades when swap engages.
      node_args: '--max-old-space-size=400',

      // Graceful shutdown window. NestJS should call enableShutdownHooks() and
      // close SSE connections within this budget on SIGINT.
      kill_timeout: 10000,

      // Auto-restart if RSS exceeds 500MB.
      max_memory_restart: '500M',

      // Crash loop guard: >10 restarts within 60s → PM2 stops the app.
      max_restarts: 10,
      min_uptime: 60000,

      // Logs in /var/log/zpoker (owned by deploy, rotated by pm2-logrotate).
      out_file: '/var/log/zpoker/out.log',
      error_file: '/var/log/zpoker/err.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss.SSS Z',
      merge_logs: true,

      watch: false,
      autorestart: true,

      // PM2 reads the file before spawning, populating process.env.
      // Path is relative to cwd above → /var/www/zpoker/apps/api/.env (chmod 600).
      env_file: '.env',

      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
