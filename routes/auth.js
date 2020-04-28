var express = require('express');
var router = express.Router();
var passport = require('passport');
var srauth = require('../bin/srauth');
var log = require('../bin/logger');

router.get('/', function(req, res) {
  log.setFunction('GET /');
  if (req.isAuthenticated()) {
    res.redirect('/profile');
  } else {
    res.render('auth', {
      title: 'Login',
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

router.get('/google/callback', passport.authenticate('google', {
  successRedirect: '/topic',
  failureRedirect: '/auth?auth=failed'
}));

router.get('/logout', function(req, res) {
  log.setFunction('GET /logout');
  req.logout();
  res.redirect('/');
});

module.exports = router;
