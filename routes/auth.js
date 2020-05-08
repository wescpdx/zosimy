const express = require('express');
const router = express.Router();
const passport = require('passport');
const srauth = require('../bin/srauth');
const log = require('../bin/logger');
const util = require('../bin/srutils');

router.get('/', function(req, res) {
  if (req.isAuthenticated()) {
    log.logVerbose('Authenticated, bouncing to profile');
    res.redirect('/profile');
  } else {
    res.render('auth', {
      title: 'Login',
    auth: util.isLoggedIn(req),
      user: srauth.usernameExpress(req)
    });
  }
});

router.get('/facebook', passport.authenticate('facebook'), function(req, res) {
  res.send('Facebook auth page');
});

router.get('/facebook/callback', passport.authenticate('facebook', {
  successRedirect: '/topic',
  failureRedirect: '/auth?auth=fail'
}));

router.get('/google', passport.authenticate('google', { scope: ['profile'] }), function(req, res) {
  res.send('Google auth page');
});

router.get('/google/callback', passport.authenticate('google', { failureRedirect: '/auth?auth=failed' }), function(req, res) {
  res.redirect('/topic');
});

router.get('/logout', function(req, res) {
  req.logout();
  res.redirect('/');
});

module.exports = router;
