const router = require("express").Router();
const ctrl = require("../controllers/playlist.controller");
const { authenticateToken } = require("../middleware/auth");
const bus = require('../services/bus')

router.post("/setup", authenticateToken, ctrl.postSetupPlaylist);
router.get("/", authenticateToken, ctrl.getPlaylistSong);

router.get('/start-playlist', authenticateToken, ctrl.playPlaylist);
router.get('/next-track', authenticateToken, ctrl.nextTrack);
router.get('/prev-track', authenticateToken, ctrl.prevTrack);
router.get('/stop-playlist', authenticateToken, ctrl.stopPlaylist);

router.get('/stream/status-sse', (req, res) => {

    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
    });


    const onStatus = (payload) => {
        res.write(`event: status\n`);
        res.write(`data: ${JSON.stringify(payload)}\n\n`);
    };

    bus.on('status', onStatus);

    const ping = setInterval(() => {
        res.write(`: ping\n\n`);
    }, 15000);

    req.on('close', () => {
        clearInterval(ping);
        bus.off('status', onStatus);
        try { res.end(); } catch { }
    });
});

module.exports = router;
