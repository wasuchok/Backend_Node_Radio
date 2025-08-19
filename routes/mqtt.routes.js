const router = require('express').Router();
const ctrl = require('../controllers/mqtt.controller');

router.post('/publish', ctrl.publish);
router.post('/publishAndWait', ctrl.publishGetStatusAndWait);

module.exports = router;
