const express = require('express');
const router = express.Router();
const log = require('../bin/logger');
const util = require('../bin/srutils');

/* GET page. */
router.get('/', function(req, res, next) {
  log.setFunction('GET /');
  res.render('tos', { 
    title: 'Terms of Service', 
    auth: req.user.uid ? true : false,
  });
});

module.exports = router;
