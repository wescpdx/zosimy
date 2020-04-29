const express = require('express');
const router = express.Router();
const srdb = require('../bin/srdb');
const srauth = require('../bin/srauth');
const log = require('../bin/logger');

router.use(srauth.loginOnlyExpress);
log.logInfo('createuser: User Authenticated');

router.get('/', function(req, res) {
  if (req.user.new) {
    log.logVerbose('createuser: Starting req.user.new');
    res.render('create_new', {
      user: req.user.playername
    });
  } else if (req.user.active) {
    log.logVerbose('createuser: Starting req.user.active');
    res.render('create_exists', {
      user: req.user.playername
    });
  } else {
    log.logVerbose('createuser: Starting req.user.pending');
    res.render('create_pending', {
      user: req.user.playername
    });
  }
});

router.post('/confirm', function(req, res) {
  if (req.body && req.body.playername && req.body.email && req.body.charname) {
    let u = {
      playername: req.body.playername,
      email: req.body.email,
      charname: req.body.charname,
      provider: req.user.provider,
      key: req.user.pkey
    };
    log.logInfo('createuser: Adding user from ' + JSON.stringify(u));
    srdb.addUser(u).then(function(u2) {
      req.user = u2;
      log.logVerbose('createuser: User added, bouncing to /topic');
      res.redirect('/topic');
    }).catch(function(err) {
      log.logError('createuser: Error adding user: ' + err.message);
      res.send('Error adding user: ' + err.message);
    });
  }
});

module.exports = router;
