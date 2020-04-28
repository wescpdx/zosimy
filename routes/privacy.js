const express = require('express');
const router = express.Router();
const log = require('../bin/logger');

/* GET page. */
router.get('/', function(req, res, next) {
  log.setFunction('GET /');
  res.render('privacy', { title: 'Seven Roses', version: util.appVersion });
});

module.exports = router;
