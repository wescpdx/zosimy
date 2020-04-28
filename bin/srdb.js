
const log = require('../bin/logger');
const V = require('voca');
const { Client } = require('pg');

//const arry = require('array-extended');
//const shortID = require('short-unique-id');

// Private methods
const _srdb = {
  getGuid: function() {
    return (new Date().getTime()) + '-' + 'fake-guid';
  },
  pg: async function(qry) {
    try {
      let client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
      });
      await client.connect();
      log.logInfo('pg: Connected to database');
      log.logVerbose('pg: Issuing query: ' + qry);
      let result = await client.query(qry);
      log.logVerbose('pg: Fetched ' + result.rows.length + ' rows');
      client.end();
      return result;
    } catch(e) {
      log.logError('Error connecting to DB:' + e.message);
    }
  },
};

// Validation functions
const valid = {
  path: function(str) {
    log.setFunction('valid-path');
    let out = str;
    if (!out) {
      log.log('Falsy value - aborting', 4);
      return out;
    }
    log.log('Validating: ' + out, 10);
    out = out.toLowerCase();
    log.log('Transform 1: ' + out, 10);
    out = S(out).replaceAll('%20', '_').replaceAll(' ', '_').replaceAll('+', '_').latinise().trim();
    log.log('Transform 2: ' + out, 10);
    if (out.match(/[^a-z0-9_-]/)) {
      log.log('Invalid characters', 8);
      return false;
    }
    log.log('Validated', 8);
    return out;
  },

  sqlText: function(str) {
    log.setFunction('valid-sqlText');
    let out = str, bslash = '\\';
    if (!out) {
      log.log('Falsy value - aborting', 4);
      return out;
    }
    log.log('Validating: ' + out, 10);
    out = S(out).trim();
    log.log('Transform 1: ' + out, 10);
    out = S(out).replaceAll(bslash, bslash + bslash).replaceAll("'", bslash + "'").replaceAll('"', bslash + '"');
    log.log('Transform 2: ' + out, 10);
    return out;
  },

  sqlString: function(str) {
    log.setFunction('valid-sqlString');
    let out = str, bslash = '\\';
    if (!out) {
      log.log('Falsy value - aborting', 4);
      return out;
    }
    log.log('Validating: ' + out, 10);
    if (S(out).latinise().s.match(/[^a-zA-Z0-9_'"\\-]/)) {
      log.log('Invalid characters');
      return false;
    }
    log.log('Validated', 8);
    out = S(out).trim();
    log.log('Transform 1: ' + out, 10);
    out = S(out).replaceAll(bslash, bslash + bslash).replaceAll("'", bslash + "'").replaceAll('"', bslash + '"');
    log.log('Transform 2: ' + out, 10);
    return out;
  }
};

// Public methods
const forExport = {
  
  fetchAnnounce: async function() {
    let qry = "SELECT message FROM announcements WHERE (NOW() >= start_date OR start_date IS NULL) AND (end_date IS NULL OR NOW() < end_date)"; 
    let result = [];
    try {
      result = await _srdb.pg(qry);
      log.logVerbose('fetchAnnounce: Received ' + result.rows.length + ' rows');
    } catch(e) {
      log.logError('fetchAnnounce: Error querying database - ' + qry + ' || ' + e.message);
      return ['We ran into an error while fetching announcements. Sorry.'];
    }
    let rows = result.rows;
    let announces = [];
    if (rows.length > 0) {
      for (let i = 0, l = rows.length; i < l; i++) {
        announces.push(rows[i].message);
      }
    }
    return announces;
  },
  
  addUser: function(u) {
    log.setFunction('addUser');
    return new Promise(function(resolve, reject) {
      // Input validation
      if (valid.sqlString(u.playername)) {
        u.playername = valid.sqlString(u.playername);
      } else {
        throw('Invalid player name: ' + u.playername);
      }
      if (valid.sqlString(u.charname)) {
        u.charname = valid.sqlString(u.charname);
      } else {
        throw('Invalid character name: ' + u.charname);
      }
      if (email = valid.sqlString(u.email)) {
        u.email = valid.sqlString(u.email);
      } else {
        throw('Invalid email: ' + u.email);
      }

      // Create user record
      log.log('Making guid', 9);
      let usrid = getGuid();
      log.log('usrid = ' + usrid, 8);
      let qry = "INSERT INTO user_data.users (guid, player_name, char_name, email, active, admin) " +
        "VALUES ('" + usrid + "','" + u.playername + "','" + u.charname + "','" + u.email + "', false, false) ";
      log.log('qry = ' + qry, 8);
      bqClient.query(qry).then(function(res) {
        log.log('Executing user insert', 7);
        log.log('res stringify: '+JSON.stringify(res), 10);
        resolve(true);
      }).then(
        function() {
          // Create user auth record
          log.log('Executing second stage', 7);
          let qry2 = "INSERT INTO user_data.user_auth (guid, provider, prkey) " +
          "VALUES ('" + usrid + "', '" + u.provider + "', '" + u.key + "')";
          bqClient.query(qry2).then(
            function(res) {
              log.log('Executing user auth insert');
              log.log('res stringify: '+JSON.stringify(res), 10);
              resolve(true);
            }
          )
        }
      ).catch(
        function(err) {
          log.log('Error: '+err, 3);
        }
      )
    });
  },

  fetchTopic: function(topic, usr) {
    log.setFunction('fetchTopic');
    return new Promise(function(resolve, reject) {
      let qry, art = {};
      // Input validation
      if (valid.path(topic)) {
        topic = valid.path(topic);
      } else {
        throw ('Invalid topic: ' + topic);
      }

      // Query for article data
      log.log('Fetching article data', 7);
      if (usr === 'admin') {
        qry = 'SELECT tt.title, ta.article_guid, ta.content, tk.keyword '
        + 'FROM topic_data.topics AS tt '
        + 'JOIN topic_data.articles AS ta '
        + 'ON tt.path = ta.topic_path '
        + 'JOIN topic_data.aliases AS tal '
        + 'ON tt.path = tal.topic_path '
        + 'JOIN topic_data.keywords AS tk '
        + 'ON tk.article_guid = ta.article_guid '
        + 'WHERE tal.alias = "' + topic + '"';
      } else {
        qry = 'SELECT tt.title, ta.article_guid, ta.content, tk.keyword'
        + ' FROM user_data.keywords AS uk'
        + ' JOIN  topic_data.keywords AS tk'
        + ' ON uk.keyword = tk.keyword'
        + ' JOIN topic_data.articles AS ta'
        + ' ON tk.article_guid = ta.article_guid'
        + ' JOIN topic_data.topics AS tt'
        + ' ON ta.topic_path = tt.path'
        + ' JOIN topic_data.aliases AS tal'
        + ' ON tt.path = tal.topic_path'
        + ' WHERE uk.user_guid = "' + usr.uid + '"'
        + 'AND tal.alias = "' + topic + '"';
      }
      log.log('qry = ' + qry, 10);
      bqClient.query(qry).then(function(res) {
        let rows, articles = [];
        log.log('res stringify: '+JSON.stringify(res), 10);
        rows = res[0];
        log.log('rows = '+JSON.stringify(rows), 10);
        log.log('rows has ' + rows.length + ' rows', 9);
        if (rows.length > 0) {
          log.log('Prep for loop with '+rows.length+' rows', 9);
          let guids = {}, guidlist = [];
          art.title = rows[0].title;
          art.articles = [];
          for (let aa=0, len = rows.length; aa < len; aa++) {
            log.log('Reading row '+aa, 9);
            log.log('row value = ' + JSON.stringify(rows[aa]), 10);
            if (guids[rows[aa].article_guid]) {
              log.log('Duplicate article - adding keyword', 6);
              guids[rows[aa].article_guid].keyword.push([rows[aa].keyword]);
            } else {
              log.log('Adding article', 6);
              guidlist.push(rows[aa].article_guid);
              guids[rows[aa].article_guid] = {
                guid: rows[aa].article_guid,
                content: rows[aa].content,
                keyword: [rows[aa].keyword]
              }
            }
          }
          // Compile articles into array
          for (let aa=0, len = guidlist.length; aa < len; aa++) {
            art.articles.push(guids[guidlist[aa]]);
          }
          resolve(art);
        } else {
          log.log('No articles found', 2);
          art.title = 'No Information Available';
          art.articles = [{
            guid: 'none',
            content: 'Your character does not know any special information on this topic.',
            keyword: 'none'
          }]
        }
        resolve(art);
      }).catch(function(err) {
        log.log('Executing failure condition', 7);
        log.log('Error: '+err);
      });
    });
  },

  fetchUserByID: function(uid) {
    log.setFunction('fetchUserByID');
    let qry, u;
    log.log('Executing', 7);
    return new Promise(function(resolve, reject) {
      let qry;
      log.log('Fetching user by ID', 7);
      qry = "SELECT guid, player_name, char_name, email, active, admin " +
        "FROM user_data.users WHERE guid = '" + uid + "'";
      log.log('qry = ' + qry, 10);
      bqClient.query(qry).then(function(res) {
        let rows, announces = [];
        log.log('res stringify: '+JSON.stringify(res), 10);
        rows = res[0];
        log.log('rows = '+JSON.stringify(rows), 10);
        log.log('rows has ' + rows.length + ' rows', 9);
        if (rows.length === 0) {
          log.log('No user found', 2);
          u = {
            uid: null,
            active: false,
            admin: false
          };
        } else if (rows.length === 1) {
          log.log('Found user: ' + rows[0].player_name, 9);
          u = {
            uid: rows[0].guid,
            playername: rows[0].player_name,
            charname: rows[0].char_name,
            email: rows[0].email,
            active: rows[0].active,
            admin: rows[0].admin
          };
        } else {
          log.log('ERROR - Duplicate GUID', 1);
          throw('Duplicate GUID ' + uid + ' Found in user_data.users');
        }
        resolve(u);
      }).catch(function(err) {
        log.log('Executing failure condition', 7);
        log.log('Error: '+err);
      });
    });
  },

  updateArticle: function(artid, content) {
    log.setFunction('updateArticle');
    let qry;
    return new Promise(function(resolve, reject) {
      let qry, art = {};
      // Input validation
      if (valid.sqlString(artid)) {
        artid = valid.sqlString(artid);
      } else {
        throw ('Invalid artid: ' + artid);
      }
      if (valid.sqlText(content)) {
        artid = valid.sqlText(content);
      } else {
        throw ('Invalid content: ' + content);
      }

      // Post new article data
      qry = 'UPDATE topic_data.articles SET content = "' + content + '"'
      + 'WHERE article_guid = "' + artid + '"';

      bqClient.query(qry).then(function(res) {
        log.log('Update query returned: ' + JSON.stringify(res));
        resolve(true);
      }).catch(function(err) {
        log.log('Executing failure condition', 7);
        log.log('Error: '+err);
      });
    });
  },

  fetchArticle: function(artid) {
    log.setFunction('fetchArticle');
    let qry, art;
    log.log('Executing', 7);
    return new Promise(function(resolve, reject) {
      let qry, art = {};
      // Input validation
      if (valid.sqlString(artid)) {
        artid = valid.sqlString(artid);
      } else {
        throw ('Invalid artid: ' + artid);
      }

      // Query for article data
      log.log('Fetching article data', 7);
      qry = 'SELECT tt.title, ta.article_guid, ta.content, tk.keyword '
      + 'FROM topic_data.topics AS tt '
      + 'JOIN topic_data.articles AS ta '
      + 'ON tt.path = ta.topic_path '
      + 'JOIN topic_data.keywords AS tk '
      + 'ON tk.article_guid = ta.article_guid '
      + 'WHERE ta.article_guid = "' + artid + '"';
      
      log.log('qry = ' + qry, 10);
      bqClient.query(qry).then(function(res) {
        let rows, article;
        log.log('res stringify: '+JSON.stringify(res), 10);
        rows = res[0];
        log.log('rows = '+JSON.stringify(rows), 10);
        log.log('rows has ' + rows.length + ' rows', 9);
        if (rows.length > 0) {
          article = {
            title: rows[0].title,
            topic: rows[0].title,
            guid: rows[0].article_guid,
            content: rows[0].content,
            keywords: [rows[0].keyword]
          }
          if (rows.length > 1) {
            log.log('Prep for loop with '+rows.length+' rows', 9);
            for (let aa=1, len = rows.length; aa < len; aa++) {
              log.log('Reading row '+aa, 9);
              log.log('row value = ' + JSON.stringify(rows[aa]), 10);
              article.keywords.push(rows[aa].keyword);
            }
          }
        } else {
          log.log('No article found', 2);
          article = {
            title: 'No article found',
            topic: 'No article found',
            guid: 'None',
            content: 'Empty',
            keywords: []
          }
        }
        log.log('Returning article: ' + JSON.stringify(art), 10);
        resolve(article);
      }).catch(function(err) {
        log.log('Executing failure condition', 7);
        log.log('Error: '+err);
      });
    });
  },

  fetchUserKeywords: function(uid) {
    log.setFunction('fetchUserKeywords');
    log.log('Executing', 7);
    return new Promise(function(resolve, reject) {
      let qry, keys = [];
      log.log('Fetching user keywords', 7);
      qry = "SELECT keyword"
        + " FROM user_data.keywords WHERE user_guid = '" + uid + "'";
      log.log('qry = ' + qry, 10);
      bqClient.query(qry).then(function(res) {
        let rows, keywords = [];
        log.log('res stringify: '+JSON.stringify(res), 10);
        rows = res[0];
        log.log('rows = '+JSON.stringify(rows), 10);
        log.log('rows has ' + rows.length + ' rows', 9);
        if (rows.length > 1) {
          if (rows.length > 0) {
            log.log('Prep for loop with '+rows.length+' rows', 9);
            for (let aa=0, len = rows.length; aa < len; aa++) {
              log.log('Reading row '+aa, 9);
              log.log('Pushing value ' + rows[aa].keyword, 9);
              keys.push(rows[aa].keyword);
            }
          }
        } else {
          log.log('No keywords found', 2);
        }
        resolve(keys);
      }).catch(function(err) {
        log.log('Executing failure condition', 7);
        log.log('Error: '+err);
      });
    });
  },

  fetchUserByAuth: function(provider, key) {
    log.setFunction('fetchUserByAuth');
    return new Promise(function(resolve, reject) {
      let qry;
      log.log('Fetching auth record', 7);
      qry = "SELECT u.guid, u.player_name, u.email, u.char_name, u.active, u.admin " +
        "FROM user_data.user_auth ua " +
        "JOIN user_data.users u ON ua.guid = u.guid " +
        "WHERE ua.provider = '" + provider + "' AND ua.prkey = '" + key + "'";
      log.log('qry = ' + qry, 10);
      bqClient.query(qry).then(function(res) {
        log.log('Executing query', 7);
        log.log(' res stringify: '+JSON.stringify(res), 10);
        let rows = res[0];
        log.log('res stringify: '+JSON.stringify(res), 10);
        log.log('rows has ' + rows.length + ' rows', 9);
        if (rows.length === 0) {
          log.log('Approving new user creation', 2);
          u = {
            new: true,
            guid: 'new',
            provider: provider,
            pkey: key
          };
        } else if (rows.length === 1) {
          log.log('Found user: ' + rows[0].player_name, 9);
          u = {
            uid: rows[0].guid,
            playername: rows[0].player_name,
            charname: rows[0].char_name,
            email: rows[0].email,
            active: rows[0].active,
            admin: rows[0].admin
          };
        } else {
          log.log('ERROR - Duplicate auth record', 1);
          throw('Duplicate auth record ' + provider + '//' + key + ' Found in user_data.users');
        }
        log.log('Ready to resolve', 8);
        log.log('u = ' + JSON.stringify(u), 10);
        resolve(u);
      }).catch(function(err) {
        log.log('Executing failure condition', 7);
        log.log('Error: '+err);
      });
    });
  },

};

module.exports = forExport;
