const createError = require('http-errors');
const express = require('express');
const path = require('path');
const session = require('express-session');
const srdb = require('./bin/srdb');
const log = require('./bin/logger');

// App initialization
const  app = express();

// Passport for authentication
const passport = require('passport');
const StrategyGoogle = require('passport-google-oauth20').Strategy;

// PUG as view engine 
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// Session storage
app.use(session({
  store: new (require('connect-pg-simple')(session))(),
  secret: process.env.SESSION_COOKIE_SECRET,
  resave: false,
  cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 }, // 30 days
  saveUninitialized: true
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
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
    log.logVerbose('app.passport: Access passport function');
    
    
    /**
    process.nextTick(function() {
      log.logInfo('app.passport: Trying to authorize Google ID ' + profile.id);
      let authy = srdb.fetchUserByAuth('google', profile.id).then(function(uid) {
        log.logVerbose('app.passport: u = ' + JSON.stringify(uid));
        log.logVerbose('app.passport: u.id = ' + JSON.stringify(uid));
        return done(null, uid);
      });
    });
    **/
  }
));

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});

// Route handlers
app.use('/', require('./routes/index'));
app.use('/users', require('./routes/users'));
app.use('/auth', require('./routes/auth'));
app.use('/topic', require('./routes/topic'));
app.use('/create', require('./routes/createuser'));
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
