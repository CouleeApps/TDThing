var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var liveReload = require("easy-livereload");

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var http = require('http');
var colyseus = require('colyseus');
var TDMPRoom = require('./server/server').TDMPRoom;

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

var file_type_map = {
  hbs: 'html', // `index.hbs` maps to `index.html`
  styl: 'css', // `styles/site.styl` maps to `styles/site.css`
  scss: 'css', // `styles/site.scss` maps to `styles/site.css`
  sass: 'css', // `styles/site.scss` maps to `styles/site.css`
  less: 'css', // `styles/site.scss` maps to `styles/site.css`
  js: 'js',
  // add the file type being edited and what you want it to be mapped to.
};

// store the generated regex of the object keys
var file_type_regex = new RegExp('\\.(' + Object.keys(file_type_map).join('|') + ')$');
app.use(liveReload({
  watchDirs: [
    path.join(__dirname, 'public'),
    path.join(__dirname, 'views')
  ],
  checkFunc: function(file) {
    return file_type_regex.test(file);
  },
  renameFunc: function(file) {
    // remap extention of the file path to one of the extentions in `file_type_map`
    return file.replace(file_type_regex, function(extention) {
      return '.' + file_type_map[extention.slice(1)];
    });
  },
}));

app.use('/', indexRouter);
app.use('/users', usersRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

app.use(function(app) {
  const server = http.createServer(app);

  let gameServer = new colyseus.Server({
    server
  });

  gameServer.register("tdmp", TDMPRoom);
  gameServer.listen(3020, "0.0.0.0");

  return function (req, res, next) {

  };
}(app));

module.exports = app;
