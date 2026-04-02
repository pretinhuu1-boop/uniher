module.exports = {
  apps: [
    {
      name: 'uniher',
      cwd: '/var/www/uniher/.next/standalone',
      script: 'node',
      args: 'server.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '750M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
  ],
};
