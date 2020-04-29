var express = require('express');
var router = express.Router();
var srauth = require('../bin/srauth');
var srdb = require('../bin/srdb');
var log = require('../bin/logger');

router.use(srauth.loginOnlyExpress);
router.use(srauth.activeOnlyExpress);

router.get('/', function(req, res) {
  log.logVerbose('profile: req.user = ' + JSON.stringify(req.user));
  srdb.fetchUserKeywords(req.user.uid).then(function(keys) {
    log.logVerbose('profile: Received keywords');
    res.render('profile', {
      title: 'User Profile',
      user: req.user.playername,
      charname: req.user.charname,
      keywords: keys
    });
  });

});

module.exports = router;
