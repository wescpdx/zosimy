const express = require('express');
const router = express.Router();
const srdb = require('../bin/srdb');
const log = require('../bin/logger');

// Log init
log.setModule('index');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Seven Roses', version: appVersion });
});

module.exports = router;
