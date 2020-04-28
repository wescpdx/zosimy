var log = require('../bin/logger');

var srauth = {

  // If not authenticated, bounce to /auth
  loginOnlyExpress: function(req, res, next) {
    if (!req.isAuthenticated()) {
      log.logVerbose('Auth failed')
      res.redirect('/auth');
    } else {
      log.logVerbose('Auth passed')
      next();
    }
  },

  // If not an active user, bounce to /create
  activeOnlyExpress: function(req, res, next) {
    if (!req.user.active) {
      log.logVerbose('Active user failed');
      res.redirect('/create');
    } else {
      log.logVerbose('Active user passed');
      next();
    }
  },

  // Accepts Express request object; if authenticated, returns username, else returns false
  usernameExpress: function(req) {
    if (req.user && req.user.playername) {
      log.logVerbose('Returning playername: ' + req.user.playername);
      return req.user.playername;
    } else {
      log.logVerbose('No playername to return');
      log.logVerbose('req.user = ' + JSON.stringify(req.user));
      return false;
    }
  }

};

module.exports = srauth;
