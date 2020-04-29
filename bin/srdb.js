
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
      log.logInfo('srdb.pg: Connected to database');
      log.logVerbose('srdb.pg: Issuing query: ' + qry);
      let result = await client.query(qry);
      log.logVerbose('srdb.pg: Fetched ' + result.rows.length + ' rows');
      client.end();
      return result;
    } catch(e) {
      log.logError('srdb.pg: Error connecting to DB:' + e.message);
    }
  },
};

// Validation functions
const valid = {
  path: function(str) {
    let out = str;
    if (!out) {
      log.logWarning('srdb.valid.path: Falsy value - aborting');
      return out;
    }
    log.logVerbose('srdb.valid.path: Validating: ' + out);
    out = V(out).toLowerCase().replaceAll('%20', '_').replaceAll(' ', '_').replaceAll('+', '_').latinise().trim().value();
    log.logVerbose('srdb.valid.path: Transform 1: ' + out);
    if (out.match(/[^a-z0-9_-]/)) {
      log.logInfo('srdb.valid.path: Invalid characters');
      return '';
    }
    log.logVerbose('srdb.valid.path: Validated');
    return out;
  },

  sqlText: function(str) {
    let out = str, esc = '\\';
    if (!out) {
      log.logWarning('srdb.valid.sqlText: Falsy value - aborting');
      return out;
    }
    log.logVerbose('srdb.valid.sqlText: Validating: ' + out);
    out = V(out).trim().replaceAll(esc, esc + esc).replaceAll("'", esc + "'").replaceAll('"', esc + '"').value();
    log.logVerbose('srdb.valid.sqlText: Transform 1: ' + out);
    return out;
  },

  sqlString: function(str) {
    const esc = '\\';
    let out = str;
    if (!out) {
      log.logWarning('srdb.valid.sqlString: Falsy value - aborting');
      return out;
    }
    log.logVerbose('srdb.valid.sqlString: Validating: ' + out);
    out = V(out).trim().replaceAll(esc, esc + esc).replaceAll("'", esc + "'").replaceAll('"', esc + '"').value();
    log.logVerbose('srdb.valid.sqlString: Transform 1: ' + out);
    out = V(out).replaceAll(/[^a-zA-Z0-9_'"\\\@-]/, '').value();
    log.logVerbose('srdb.valid.sqlString: Transform 2: ' + out);
    log.logVerbose('srdb.valid.sqlString: Validated');
    return out;
  }
};

// Public methods
const forExport = {
  
  fetchAnnounce: async function() {
    let qry = "SELECT message FROM announcements " +
        "WHERE (NOW() >= start_date OR start_date IS NULL) AND (end_date IS NULL OR NOW() < end_date)"; 
    let result = [];
    try {
      result = await _srdb.pg(qry);
      log.logVerbose('srdb.fetchAnnounce: Received ' + result.rows.length + ' rows');
    } catch(e) {
      log.logError('srdb.fetchAnnounce: Error querying database - ' + qry + ' || ' + e.message);
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
  
  fetchUserByAuth: async function(provider, key) {
    let qry = "SELECT u.user_id, u.player_name, u.email, u.char_name, u.active, u.admin " +
        "FROM user_auth ua " +
        "JOIN users u ON ua.user_id = u.user_id " +
        "WHERE ua.provider = '" + provider + "' AND ua.key = '" + key + "'";
    let result = [];
    try {
      result = await _srdb.pg(qry);
      log.logVerbose('srdb.fetchUserByAuth: Received ' + result.rows.length + ' rows');
    } catch(e) {
      log.logError('srdb.fetchUserByAuth: Error querying database - ' + qry + ' || ' + e.message);
      return null;
    }
    let rows = result.rows;
    let u = {};
    if (rows.length === 0) {
      log.logInfo('srdb.fetchUserByAuth: Blank new user record');
      u = {
        new: true,
        guid: 'new',
        provider: provider,
        pkey: key
      };
    } else if (rows.length === 1) {
      log.logInfo('srdb.fetchUserByAuth: Found user: ' + rows[0].player_name);
      u = {
        uid: rows[0].guid,
        playername: rows[0].player_name,
        charname: rows[0].char_name,
        email: rows[0].email,
        active: rows[0].active,
        admin: rows[0].admin
      };
    } else {
      log.logError('srdb.fetchUserByAuth: ERROR - Duplicate auth record');
      throw('Duplicate auth record ' + provider + '//' + key + ' Found in users table');
    }
    log.logVerbose('srdb.fetchUserByAuth: u = ' + JSON.stringify(u));
    return u;
  },
  
  addUser: async function(u) {
    u.playername = valid.sqlString(u.playername);
    if (!u.playername) {
      throw(new Error('Invalid player name: ' + u.playername));
    }
    u.charname = valid.sqlString(u.charname);
    if (!u.charname) {
      throw(new Error('Invalid character name: ' + u.charname));
    }
    u.email = valid.sqlString(u.email);
    if (!u.email ) {
      throw(new Error('Invalid email: ' + u.email));
    }
    
    // Create user record
    log.logVerbose('srdb.addUser: Ready to create user record');
    let qry = "INSERT INTO users (player_name, char_name, email, active, admin) " +
        "VALUES ('" + u.playername + "','" + u.charname + "','" + u.email + "', false, false) " +
        "RETURNING user_id";
    log.logVerbose('srdb.addUser: qry = ' + qry);
    try {
      result = await _srdb.pg(qry);
      log.logVerbose('srdb.addUser: Affected ' + result.rowCount + ' rows');
    } catch(e) {
      log.logError('srdb.addUser: Error querying database - ' + qry + ' || ' + e.message);
      return null;
    }
    if (result.rows.length !== 1) {
      throw('srdb.addUser: User record insert did not return an ID properly');
    }
    let newUserId = result.rows[0].user_id;
    
    // Create user auth record
    log.logVerbose('srdb.addUser: Ready to create user auth');
    qry = "INSERT INTO user_auth (user_id, provider, key) " +
        "VALUES ('" + newUserId + "', '" + u.provider + "', '" + u.key + "')";
    log.logVerbose('srdb.addUser: qry = ' + qry);
    try {
      result = await _srdb.pg(qry);
      log.logVerbose('srdb.addUser: Affected ' + result.rowCount + ' rows');
    } catch(e) {
      log.logError('srdb.addUser: Error querying database - ' + qry + ' || ' + e.message);
      return null;
    }
  },

  fetchTopic: function(topic, usr) {
    return new Promise(function(resolve, reject) {
      let qry, art = {};
      // Input validation
      if (valid.path(topic)) {
        topic = valid.path(topic);
      } else {
        throw ('Invalid topic: ' + topic);
      }

      // Query for article data
      log.logVerbose('srdb.fetchTopic: Fetching article data');
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
      log.logVerbose('srdb.fetchTopic: qry = ' + qry);
      bqClient.query(qry).then(function(res) {
        let rows, articles = [];
        log.logVerbose('srdb.fetchTopic: res stringify: '+JSON.stringify(res));
        rows = res[0];
        log.logVerbose('srdb.fetchTopic: rows = '+JSON.stringify(rows));
        log.logVerbose('srdb.fetchTopic: rows has ' + rows.length + ' rows');
        if (rows.length > 0) {
          let guids = {}, guidlist = [];
          art.title = rows[0].title;
          art.articles = [];
          for (let aa=0, len = rows.length; aa < len; aa++) {
            if (guids[rows[aa].article_guid]) {
              log.logInfo('srdb.fetchTopic: Duplicate article - adding keyword');
              guids[rows[aa].article_guid].keyword.push([rows[aa].keyword]);
            } else {
              log.logVerbose('srdb.fetchTopic: Adding article');
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
          log.logWarning('srdb.fetchTopic: No articles found');
          art.title = 'No Information Available';
          art.articles = [{
            guid: 'none',
            content: 'Your character does not know any special information on this topic.',
            keyword: 'none'
          }]
        }
        resolve(art);
      }).catch(function(err) {
        log.logError('srdb.fetchTopic: Executing failure condition');
        log.logError('srdb.fetchTopic: Error: '+err);
      });
    });
  },

  fetchUserByID: function(uid) {
    let qry, u;
    log.logVerbose('srdb.fetchUserByID: Executing');
    return new Promise(function(resolve, reject) {
      let qry;
      log.logVerbose('srdb.fetchUserByID: Fetching user by ID');
      qry = "SELECT guid, player_name, char_name, email, active, admin " +
        "FROM user_data.users WHERE guid = '" + uid + "'";
      log.logVerbose('srdb.fetchUserByID: qry = ' + qry);
      bqClient.query(qry).then(function(res) {
        let rows, announces = [];
        log.logVerbose('srdb.fetchUserByID: res stringify: '+JSON.stringify(res));
        rows = res[0];
        log.logVerbose('srdb.fetchUserByID: rows = '+JSON.stringify(rows));
        log.logVerbose('srdb.fetchUserByID: rows has ' + rows.length + ' rows');
        if (rows.length === 0) {
          log.logWarning('srdb.fetchUserByID: No user found');
          u = {
            uid: null,
            active: false,
            admin: false
          };
        } else if (rows.length === 1) {
          log.logInfo('srdb.fetchUserByID: Found user: ' + rows[0].player_name);
          u = {
            uid: rows[0].guid,
            playername: rows[0].player_name,
            charname: rows[0].char_name,
            email: rows[0].email,
            active: rows[0].active,
            admin: rows[0].admin
          };
        } else {
          log.logError('srdb.fetchUserByID: ERROR - Duplicate GUID');
          throw('Duplicate GUID ' + uid + ' Found in user_data.users');
        }
        resolve(u);
      }).catch(function(err) {
        log.logError('srdb.fetchUserByID: Executing failure condition');
        log.logError('srdb.fetchUserByID: Error: '+err);
      });
    });
  },

  updateArticle: function(artid, content) {
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
        log.logVerbose('srdb.updateArticle: Update query returned: ' + JSON.stringify(res));
        resolve(true);
      }).catch(function(err) {
        log.logError('srdb.updateArticle: Executing failure condition', 7);
        log.logError('srdb.updateArticle: Error: '+err);
      });
    });
  },

  fetchArticle: function(artid) {
    let qry, art;
    log.logVerbose('srdb.fetchArticle: Executing');
    return new Promise(function(resolve, reject) {
      let qry, art = {};
      // Input validation
      if (valid.sqlString(artid)) {
        artid = valid.sqlString(artid);
      } else {
        throw ('Invalid artid: ' + artid);
      }

      // Query for article data
      log.logVerbose('srdb.fetchArticle: Fetching article data');
      qry = 'SELECT tt.title, ta.article_guid, ta.content, tk.keyword '
      + 'FROM topic_data.topics AS tt '
      + 'JOIN topic_data.articles AS ta '
      + 'ON tt.path = ta.topic_path '
      + 'JOIN topic_data.keywords AS tk '
      + 'ON tk.article_guid = ta.article_guid '
      + 'WHERE ta.article_guid = "' + artid + '"';
      
      log.logVerbose('srdb.fetchArticle: qry = ' + qry);
      bqClient.query(qry).then(function(res) {
        let rows, article;
        log.logVerbose('srdb.fetchArticle: res stringify: '+JSON.stringify(res), 10);
        rows = res[0];
        log.logVerbose('srdb.fetchArticle: rows = '+JSON.stringify(rows), 10);
        log.logVerbose('srdb.fetchArticle: rows has ' + rows.length + ' rows', 9);
        if (rows.length > 0) {
          article = {
            title: rows[0].title,
            topic: rows[0].title,
            guid: rows[0].article_guid,
            content: rows[0].content,
            keywords: [rows[0].keyword]
          }
          if (rows.length > 1) {
            for (let aa=1, len = rows.length; aa < len; aa++) {
              article.keywords.push(rows[aa].keyword);
            }
          }
        } else {
          log.logInfo('srdb.fetchArticle: No article found');
          article = {
            title: 'No article found',
            topic: 'No article found',
            guid: 'None',
            content: 'Empty',
            keywords: []
          }
        }
        log.logVerbose('srdb.fetchArticle: Returning article: ' + JSON.stringify(art));
        resolve(article);
      }).catch(function(err) {
        log.logError('srdb.fetchArticle: Executing failure condition');
        log.logError('srdb.fetchArticle: Error: '+err);
      });
    });
  },

  fetchUserKeywords: function(uid) {
    log.logVerbose('srdb.fetchUserKeywords: Executing');
    return new Promise(function(resolve, reject) {
      let qry, keys = [];
      log.logVerbose('srdb.fetchUserKeywords: Fetching user keywords', 7);
      qry = "SELECT keyword"
        + " FROM user_data.keywords WHERE user_guid = '" + uid + "'";
      log.logVerbose('srdb.fetchUserKeywords: qry = ' + qry, 10);
      bqClient.query(qry).then(function(res) {
        let rows, keywords = [];
        log.logVerbose('srdb.fetchUserKeywords: res stringify: '+JSON.stringify(res));
        rows = res[0];
        if (rows.length > 1) {
          if (rows.length > 0) {
            for (let aa=0, len = rows.length; aa < len; aa++) {
              keys.push(rows[aa].keyword);
            }
          }
        } else {
          log.logInfo('srdb.fetchUserKeywords: No keywords found');
        }
        resolve(keys);
      }).catch(function(err) {
        log.logError('srdb.fetchUserKeywords: Executing failure condition', 7);
        log.logError('srdb.fetchUserKeywords: Error: '+err);
      });
    });
  },



};

module.exports = forExport;
