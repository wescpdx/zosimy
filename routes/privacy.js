const express = require('express');
const router = express.Router();
const log = require('../bin/logger');
const util = require('../bin/srutils');

/* GET page. */
router.get('/', function(req, res, next) {
  log.setFunction('GET /');
  res.render('privacy', { 
    title: 'Privacy Policy',
    auth: util.isLoggedIn(req)
  });
});

module.exports = router;
