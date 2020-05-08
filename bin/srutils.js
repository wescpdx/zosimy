
const utilities = {
  appVersion: '0.01',

  isLoggedIn: function(req) {
    return req.user && req.user.uid ? true : false;
  }

};

module.exports = utilities;
