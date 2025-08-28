const router = require('express').Router();
const ctrl = require('../controllers/mqtt.controller');
const { authenticateToken } = require('../middleware/auth');

router.post('/publish', authenticateToken, ctrl.publish);
router.post('/publishAndWait', authenticateToken, ctrl.publishGetStatusAndWait);
router.get('/status', authenticateToken, ctrl.getStatus);

module.exports = router;
