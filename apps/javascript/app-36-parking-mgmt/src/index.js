const { createApp } = require('./app');
const { appConfig } = require('./config/appConfig');

createApp().then((app) => {
  app.listen(appConfig.port, () => {
    console.log(`Parking Management System listening at http://localhost:${appConfig.port}`);
  });
}).catch((err) => {
  console.error('Failed to start app:', err);
  process.exit(1);
});
