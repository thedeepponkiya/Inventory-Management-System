// PM2 process definition for production - run with `pm2 start ecosystem.config.js`.
// Keeps the backend alive across crashes and server reboots (see `pm2 startup`/`pm2 save`).
module.exports = {
  apps: [
    {
      name: 'ims-backend',
      script: 'server.js',
      cwd: __dirname,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};