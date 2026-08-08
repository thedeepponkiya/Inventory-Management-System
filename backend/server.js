require('dotenv').config();
const app = require('./src/app');
const { startMetaSyncScheduler } = require('./src/jobs/metaSync.job');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  startMetaSyncScheduler();
});