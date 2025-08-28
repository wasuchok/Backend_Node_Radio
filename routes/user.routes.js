const router = require("express").Router();
const ctrl = require("../controllers/user.controller");
const { authenticateToken } = require("../middleware/auth");

router.post("/register", ctrl.register);
router.post("/login", ctrl.login);
router.get("/refreshToken", ctrl.refreshToken);
router.post("/logout", ctrl.logout);
router.get("/profile", authenticateToken, ctrl.getProfile);

module.exports = router;
