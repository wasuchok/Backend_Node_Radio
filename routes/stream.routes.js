const router = require('express').Router();
const ctrl = require('../controllers/stream.controller');
const { authenticateToken } = require('../middleware/auth');

router.get('/start', ctrl.start);
router.post('/start', ctrl.start);
router.get('/stop', ctrl.stop);
router.get('/status', ctrl.status);
router.get('/pause', ctrl.pause);
router.get('/resume', ctrl.resume);




router.post('/uploadSongYT', ctrl.uploadSongYT);
router.post('/uploadSongFile', authenticateToken, ctrl.upload.single('song'), ctrl.uploadSongFile);
router.get('/startFile', ctrl.startFile);

module.exports = router;
