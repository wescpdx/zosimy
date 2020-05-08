var express = require('express');
var router = express.Router();
var srdb = require('../bin/srdb');
var srauth = require('../bin/srauth');
var log = require('../bin/logger');

router.use(srauth.loginOnlyExpress);
router.use(srauth.activeOnlyExpress);

router.get('/', function(req, res) {
  res.render('topichome', {
    userName: req.user.playername
  });
});

router.post('/edit/updatearticle/:id', function(req,res) {
  log.logVerbose('topic.edit.post: Posting update for article id ' + req.params.id);
  if (req.user.admin) {
    log.logVerbose('topic.edit.post: req.body = ' + JSON.stringify(req.body), 10);
    srdb.updateArticle(req.params.id, req.body.content).then(function(data) {
      res.render('edit_confirm', {
        title: data ? 'Article Successfully Updated' : 'Article Update Failed',
        auth: true
      });
    });
  } else {
    res.render('accessdenied');
  }
});

router.get('/edit/:id', function(req, res) {
  log.logVerbose('topic.edit.get: Entering router for id '+req.params.id);
  if (req.user.admin) {
    srdb.fetchArticle(req.params.id).then(function(article) {
      res.render('edit_article', {
        title: 'Edit: ' + article.title,
        auth: true,
        topic: article.title,
        id: article.article_id,
        acontent: article.content,
        keywords: article.keywords
      });
    });
  } else {
    res.render('accessdenied');
  }
});

router.get('/:id', function(req, res) {
  log.logVerbose('topic.get: Entering router for id '+req.params.id);
  srdb.fetchTopic(req.params.id, req.user).then(function(content_array) {
    log.logVerbose('topic.get: content_array = ' + JSON.stringify(content_array));
    res.render(req.user.admin ? 'topicadmin' : 'topic', {
      title: 'Topic: ' + content_array[0].display_name,
      auth: true,
      display_name: content_array[0].display_name,
      content_array: content_array,
      charName: req.user.charname
    });
  });
});


module.exports = router;
