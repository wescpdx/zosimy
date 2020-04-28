var log = require('../bin/logger');

var srauth = {

  // If not authenticated, bounce to /auth
  loginOnlyExpress: function(req, res, next) {
    log.setFunction('loginOnlyExpress');
    if (!req.isAuthenticated()) {
      log.log('Auth failed', 8)
      res.redirect('/auth');
    } else {
      log.log('Auth passed', 8)
      next();
    }
  },

  // If not an active user, bounce to /create
  activeOnlyExpress: function(req, res, next) {
    log.setFunction('activeOnlyExpress');
    if (!req.user.active) {
      log.log('Active user failed', 8);
      res.redirect('/create');
    } else {
      log.log('Active user passed', 8);
      next();
    }
  },

  // Accepts Express request object; if authenticated, returns username, else returns false
  usernameExpress: function(req) {
    log.setFunction('usernameExpress');
    if (req.user && req.user.playername) {
      log.log('Returning playername: ' + req.user.playername, 8);
      return req.user.playername;
    } else {
      log.log('No playername to return', 8);
      log.log('req.user = ' + JSON.stringify(req.user), 10);
      return false;
    }
  }

};

module.exports = srauth;
