const express = require('express');
const router = express.Router();
const { postSeed, getList, deleteAll, postAppend } = require('../controllers/device.controller');
const { authenticateToken } = require('../middleware/auth');

router.get('/', authenticateToken, getList);
router.post('/seed', postSeed);
router.post('/append', postAppend);
router.delete('/', deleteAll);

module.exports = router;
