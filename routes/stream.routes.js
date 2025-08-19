const router = require('express').Router();
const ctrl = require('../controllers/stream.controller');

router.get('/start', ctrl.start);
router.post('/start', ctrl.start);
router.get('/stop', ctrl.stop);
router.get('/status', ctrl.status);
router.get('/pause', ctrl.pause);
router.get('/resume', ctrl.resume);


router.post('/uploadSongYT', ctrl.uploadSongYT);
router.get('/getSongList', ctrl.getSongList);
router.post('/uploadSongFile', ctrl.upload.single('song'), ctrl.uploadSongFile);
router.get('/startFile', ctrl.startFile);

module.exports = router;
