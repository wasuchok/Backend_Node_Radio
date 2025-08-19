const express = require('express');
const bodyParser = require('body-parser');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const cookieParser = require("cookie-parser");

function createApp() {
    const app = express();
    app.use(cookieParser());
    app.use(bodyParser.json());
    app.use(routes);
    app.use(errorHandler);
    return app;
}

module.exports = createApp;
