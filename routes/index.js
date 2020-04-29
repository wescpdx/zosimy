const express = require('express');
const router = express.Router();
const srdb = require('../bin/srdb');
const log = require('../bin/logger');
const util = require('../bin/srutils');

/* GET home page. */
router.get('/', function(req, res, next) {
  var announcement = srdb.fetchAnnounce(null).then(function(rows){
    res.render('index', { title: 'Seven Roses', announce: rows, version: util.appVersion });
  });
});

module.exports = router;
