const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const { authenticate } = require('../../middlewares/auth');
const { uploadFiles } = require('../controllers/uploadController');

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.UPLOAD_RATE_LIMIT_MAX || 2000),
  keyGenerator: (req) => req.user?._id?.toString() || req.ip,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many uploads, please try again later' },
});

router.use(authenticate, uploadLimiter);

router.post('/', uploadFiles);

module.exports = router;
