require('dotenv').config();

const cfg = {
    app: {
        port: parseInt(process.env.PORT || '8080', 10),
    },
    icecast: {
        host: process.env.ICECAST_HOST || 'localhost',
        port: parseInt(process.env.ICECAST_PORT || '8000', 10),
        username: process.env.ICECAST_USERNAME || 'source',
        password: process.env.ICECAST_PASSWORD || 'admin',
        mount: process.env.ICECAST_MOUNT || '/stream.mp3',
    },
    mqtt: {
        url: process.env.MQTT_URL || 'ws://localhost:9001',
        username: process.env.MQTT_USERNAME || 'admin',
        password: process.env.MQTT_PASSWORD || 'admin',
        topic: {
            command: process.env.MQTT_TOPIC_COMMAND || 'mass-radio/zone1/command',
            status: process.env.MQTT_TOPIC_STATUS || 'mass-radio/zone1/status',
        },
        ignoreRetained: String(process.env.MQTT_IGNORE_RETAINED || 'true') === 'true',
    },
    stream: {
        autoReplayOnEnd: String(process.env.AUTO_REPLAY_ON_END || 'false') === 'true',
    },
};

module.exports = cfg;
