const express = require('express');
const router = express.Router();
const srdb = require('../bin/srdb');
const log = require('../bin/logger');
const util = require('../bin/srutils');

// Log init
log.setModule('admin');

// Init database
srdb.initializeDatabase();

/* GET */
router.get('/', function(req, res, next) {
  res.render('admin', { 
    title: 'Admin Panel', 
    version: util.appVersion
  });
});

module.exports = router;
