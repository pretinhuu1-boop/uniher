module.exports = {
  apps: [
    {
      name: 'uniher',
      cwd: '/var/www/uniher',
      script: 'npm',
      args: 'run start',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '750M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
  ],
};
