var log = require('../bin/logger');

var srauth = {

  // If not authenticated, bounce to /auth
  loginOnlyExpress: function(req, res, next) {
    if (!req.isAuthenticated()) {
      log.logVerbose('srauth.loginOnlyExpress: Auth failed');
      res.redirect('/auth');
    } else {
      log.logVerbose('srauth.loginOnlyExpress: Auth passed');
      next();
    }
  },

  // If not an active user, bounce to /create
  activeOnlyExpress: function(req, res, next) {
    if (!req.user.active) {
      log.logVerbose('srauth.activeOnlyExpress: User not active - user info = ' + JSON.stringify(req.user));
      res.redirect('/create');
    } else {
      log.logVerbose('srauth.activeOnlyExpress: Active user passed');
      next();
    }
  },

  // Accepts Express request object; if authenticated, returns username, else returns false
  usernameExpress: function(req) {
    if (req.user && req.user.playername) {
      log.logVerbose('srauth.usernameExpress: Returning playername: ' + req.user.playername);
      return req.user.playername;
    } else {
      log.logVerbose('srauth.usernameExpress: No playername to return');
      log.logVerbose('srauth.usernameExpress: req.user = ' + JSON.stringify(req.user));
      return false;
    }
  }

};

module.exports = srauth;
