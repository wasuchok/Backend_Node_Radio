
const http = require('http');
const cfg = require('./config/config');
const createApp = require('./app');
const { connectMongo } = require('./database/mongoose');
const mqttSvc = require('./services/mqtt.service');
const { createWSServer } = require('./ws/wsServer');

(async () => {
    try {
        await connectMongo({ uri: process.env.MONGODB_URI, dbName: process.env.MONGODB_DBNAME });


        const app = createApp();
        const server = http.createServer(app);

        createWSServer(server);


        mqttSvc.connectAndSend();


        app.get('/devices/status', (req, res) => {
            res.json(mqttSvc.getStatus());
        });


        server.listen(cfg.app.port, () => {
            console.log(`🟢 HTTP listening on http://localhost:${cfg.app.port}`);
        });

    } catch (err) {
        console.error('🚫 Failed to start server:', err);
        process.exit(1);
    }
})();
