const express = require('express');
const router = express.Router();
const srdb = require('../bin/srdb');
const log = require('../bin/logger');
const util = require('../bin/srutils');

// Log init
log.setModule('admin');

/* GET */
router.get('/', function(req, res, next) {
  res.render('admin', { 
    title: 'Admin Panel',
    auth: req.user.uid ? true : false,    
    version: util.appVersion
  });
});

module.exports = router;
