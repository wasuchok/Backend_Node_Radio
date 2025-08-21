const router = require("express").Router();
const ctrl = require("../controllers/playlist.controller");

router.post("/setup", ctrl.postSetupPlaylist);
router.get("/", ctrl.getPlaylistSong);
router.get("/song", ctrl.getSongListSong)

module.exports = router;
