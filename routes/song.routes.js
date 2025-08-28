const router = require("express").Router();
const ctrl = require("../controllers/song.controller");
const { authenticateToken } = require("../middleware/auth");

router.get('/', authenticateToken, ctrl.getSongList);
router.delete("/remove/:songId", authenticateToken, ctrl.deleteSong);

module.exports = router;