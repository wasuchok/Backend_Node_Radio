const express = require('express');
const bodyParser = require('body-parser');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const cookieParser = require("cookie-parser");
const cors = require('cors');

function createApp() {
    const app = express();
    app.use(cookieParser());
    app.use(
        cors({
            origin: (origin, callback) => {
                // อนุญาตให้ทุก origin ส่ง cookies ในกรณีแอปมือถือ
                // หรือระบุ origin เฉพาะ เช่น ['http://localhost:3000', 'http://10.0.2.2:8080']
                callback(null, true);
            },
            credentials: true, // อนุญาตให้ส่ง cookies
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization'],
        })
    );
    app.use(bodyParser.json());
    app.use(routes);
    app.use(errorHandler);
    return app;
}

module.exports = createApp;
