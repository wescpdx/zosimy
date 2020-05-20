var express = require('express');
var router = express.Router();
var srauth = require('../bin/srauth');
var srdb = require('../bin/srdb');
var log = require('../bin/logger');
const util = require('../bin/srutils');

router.use(srauth.loginOnlyExpress);
//router.use(srauth.activeOnlyExpress);

router.get('/', function(req, res) {
  log.logVerbose('profile-home: req.user = ' + JSON.stringify(req.user));
  res.render('profile', {
    title: 'User Profile',
    auth: util.isLoggedIn(req),
    user: req.user.playername,
    charname: req.user.charname,
    qualities: req.user.qualities
  });
});

router.get('/edit/:id', function(req, res) {
  log.logVerbose('profile: Entering profile for id '+req.params.id);
  if (req.user.admin) {
    srdb.fetchUserByID(req.params.id).then(function(user) {
      res.render('edit_user', {
        title: 'Edit: ' + user.player_name,
        auth: true,
        player_name: user.player_name,
        char_name: user.char_name,
        id: user.user_id,
        email: user.email,
        active: user.active,
        admin: user.admin,
        keywords: user.keywords
      });
    });
  } else {
    res.render('accessdenied');
  }
});


module.exports = router;
