const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');

// App initialization
const  app = express();

// Database connection
const { Client } = require('pg');
client = new Client();
await client.connect();


// Passport for authentication
//var passport = require('passport');
//var passportConfig = require('./bin/auth_config');

// Route handlers
const  routeIndex = require('./routes/index');
const  routeUsers = require('./routes/users');


// Jade as view engine 
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// Middleware
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Install route handlers
app.use('/', routeIndex);
app.use('/users', routeUsers);

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
