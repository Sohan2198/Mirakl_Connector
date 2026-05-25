require('dotenv').config();
require('./src/app'); // Ensure basic middlewares and app configuration are loaded
require('./src/server'); // Load and launch the main server logic and cron jobs
