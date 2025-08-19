const router = require("express").Router();
const ctrl = require("../controllers/user.controller");

router.post("/register", ctrl.register);
router.post("/login", ctrl.login);
router.get("/refreshToken", ctrl.refreshToken);

module.exports = router;
