var express = require('express');
var router = express.Router();
var srauth = require('../bin/srauth');
var srdb = require('../bin/srdb');
var log = require('../bin/logger');

router.use(srauth.loginOnlyExpress);
//router.use(srauth.activeOnlyExpress);

router.get('/', function(req, res) {
  log.logVerbose('profile: req.user = ' + JSON.stringify(req.user));
  res.render('profile', {
    title: 'User Profile',
    auth: util.isLoggedIn(req),
    user: req.user.playername,
    charname: req.user.charname,
    qualities: req.user.qualities
  });

});

module.exports = router;
