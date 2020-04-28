const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');

// App initialization
const  app = express();

// Passport for authentication
var passport = require('passport');
var StrategyGoogle = require('passport-google-oauth20').Strategy;

// PUG as view engine 
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// Middleware
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Passport configuration
app.use(passport.initialize());
app.use(passport.session());

passport.use(new StrategyGoogle(
  {
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: 'https://seven-roses.herokuapp.com/auth/google/callback'
  },
  function(accessToken, refreshToken, profile, done) {
    process.nextTick(function() {
      log.logInfo('Trying to authorize Google ID ' + profile.id);
      var authy = srdb.fetchUserByAuth('google', profile.id).then(function(uid) {
        log.logVerbose('Executing passport callback via promise', 9);
        log.logVerbose('u = ' + uid, 10);
        log.logVerbose('u.guid = ' + uid, 10);
        return done(null, uid);
      });
    });
  }
));

// Route handlers
app.use('/', require('./routes/index'));
app.use('/users', require('./routes/users'));
app.use('/auth', require('./routes/auth'));
//app.use('/topic', require('./routes/topic'));
//app.use('/create', require('./routes/create'));
app.use('/profile', require('./routes/profile'));
app.use('/admin', require('./routes/admin'));
app.use('/privacy', require('./routes/privacy'));
app.use('/tos', require('./routes/tos'));

// Catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// Error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

// Export
module.exports = app;
