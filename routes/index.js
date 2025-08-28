const router = require('express').Router();

router.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

router.use('/stream', require('./stream.routes'));
router.use('/mqtt', require('./mqtt.routes'));
router.use('/device', require('./device.routes'))
router.use('/auth', require('./user.routes'))
router.use('/playlist', require('./playlist.routes'))
router.use('/song', require('./song.routes'))

module.exports = router;
