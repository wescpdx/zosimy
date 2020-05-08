const express = require('express');
const router = express.Router();
const log = require('../bin/logger');
const util = require('../bin/srutils');

/* GET page. */
router.get('/', function(req, res, next) {
  log.setFunction('GET /');
  res.render('privacy', { 
    title: 'Privacy Policy',
    auth: req.user.uid ? true : false,    
    version: util.appVersion 
  });
});

module.exports = router;
