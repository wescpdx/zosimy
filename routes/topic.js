var express = require('express');
var router = express.Router();
var srdb = require('../bin/srdb');
var srauth = require('../bin/srauth');
var log = require('../bin/logger');

router.use(srauth.loginOnlyExpress);
router.use(srauth.activeOnlyExpress);

router.get('/', function(req, res) {
  log.setFunction('GET /');
  res.render('topichome', {
    title: 'Topics',
    user: req.user.playername
  });
});

router.post('/edit/updatearticle/:id', function(req,res) {
  log.setFunction('POST /edit/submit');
  log.log('Posting update for article guid ' + req.params.id);
  if (req.user.admin) {
    log.log('req.body = ' + JSON.stringify(req.body), 10);
    srdb.updateArticle(req.params.id, req.body.content).then(function(data) {
      log.setFunction('updateArticle next');
      res.render('edit_confirm', {
        title: data ? 'Article Successfully Updated' : 'Article Update Failed'
      });
    });
  } else {
    res.render('accessdenied');
  }
});

router.get('/edit/:id', function(req, res) {
  log.setFunction('GET /edit/<id>');
  log.log('Entering router for id '+req.params.id);
  if (req.user.admin) {
    srdb.fetchArticle(req.params.id).then(function(article) {
      log.setFunction('fetchArticle next');
      res.render('edit_article', {
        title: article.title,
        topic: article.title,
        guid: article.guid,
        acontent: article.content,
        keywords: article.keywords
      });
    });
  } else {
    res.render('accessdenied');
  }
});

router.get('/:id', function(req, res) {
  log.setFunction('GET /<id>');
  log.log('Entering router for id '+req.params.id);
  var usr = req.user.admin ? 'admin' : req.user;
  srdb.fetchTopic(req.params.id, usr).then(function(topic) {
    log.setFunction('fetchTopic next');
    var toRender = req.user.admin ? 'topicadmin' : 'topic';
    res.render(toRender, {
      title: topic.title,
      topic: req.params.id,
      user: req.user.playername,
      charname: req.user.charname,
      articles: topic.articles
    });
  });
});


module.exports = router;
