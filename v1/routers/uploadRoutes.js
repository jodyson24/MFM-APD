const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middlewares/auth');
const { uploadFiles } = require('../controllers/uploadController');

router.use(authenticate);

router.post('/', uploadFiles);

module.exports = router;
