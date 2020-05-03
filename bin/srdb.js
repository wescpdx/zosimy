
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
    let result = [];
    try {
      let client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
      });
      await client.connect();
      log.logInfo('srdb.pg: Connected to database');
      log.logVerbose('srdb.pg: Issuing query: ' + qry);
      result = await client.query(qry);
      log.logVerbose('srdb.pg: Fetched ' + result.rows.length + ' rows');
      client.end();
      return result;
    } catch(e) {
      log.logError('srdb.pg: Error connecting to DB:' + e.message);
    }
  },
  satisfyRule: function(usr, rule) {
    log.logVerbose('srdb.satisfyRule: Checking rule ' + JSON.stringify(rule));
    if (usr.admin) {
      return true;
    }
    return false;
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
    out = V(out).lowerCase().replaceAll('%20', '_').replaceAll(' ', '_').replaceAll('+', '_').latinise().trim().value();
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
    out = V(out).trim().replaceAll(esc, esc + esc).replaceAll("'", "''").replaceAll('"', esc + '"').value();
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
    out = V(out).trim().replaceAll(esc, esc + esc).replaceAll("'", "''").replaceAll('"', esc + '"').value();
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
        uid: 'pending',
        provider: provider,
        pkey: key
      };
    } else if (rows.length === 1) {
      log.logInfo('srdb.fetchUserByAuth: Found user: ' + rows[0].player_name);
      u = {
        uid: rows[0].user_id,
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
    let result = [];
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

  fetchTopic: async function(topic, usr) {
    // Input validation
    if (valid.path(topic)) {
      topic = valid.path(topic);
    } else {
      throw ('Invalid topic string: ' + topic);
    }
    let qry = "SELECT tt.display_name, ta.article_id, ta.content, tr.rule " +
          "FROM topics AS tt " +
          "JOIN articles AS ta " +
          "ON tt.topic_id = ta.topic_id " +
          "JOIN rules AS tr " +
          "ON tr.article_id = ta.article_id " +
          "WHERE tt.title = '" + topic + "'";
    let result = [];
    try {
      result = await _srdb.pg(qry);
      log.logVerbose('srdb.fetchTopic: Received ' + result.rows.length + ' rows');
      log.logVerbose('srdb.fetchTopic: Received ' + result.rows.length + ' rows');
    } catch(e) {
      log.logError('srdb.fetchTopic: Error querying database - ' + qry + ' || ' + e.message);
      return [];
    }
    let rows = result.rows;
    let visibles = {};
    let output = [];
    if (rows.length > 0) {
      for (let i = 0, l = rows.length; i < l; i++) {
        let thisRow = rows[i];
        if (_srdb.satisfyRule(usr, thisRow.rule)) {
          log.logVerbose('srdb.fetchTopic: Rule satisfied for article_id ' + thisRow.article_id);
          if (!visibles[thisRow.article_id]) {
            visibles[thisRow.article_id] = true;
            output.push(thisRow);
          }
        } else {
          log.logVerbose('srdb.fetchTopic: Rule failed for article_id ' + thisRow.article_id);
        }
      } 
    } else {
      log.logWarning('srdb.fetchTopic: No articles for this topic');
    }
    log.logVerbose('srdb.fetchTopic: Output = ' + JSON.stringify(output));
    return output;
  },

  fetchUserByID: async function(uid) {
    let qry = "SELECT user_id, player_name, char_name, email, active, admin " +
        "FROM user_data.users WHERE user_id = '" + uid + "'";
    let result = [];
    try {
      result = await _srdb.pg(qry);
      log.logVerbose('srdb.fetchUserByID: Received ' + result.rows.length + ' rows');
    } catch(e) {
      log.logError('srdb.fetchUserByID: Error querying database - ' + qry + ' || ' + e.message);
      return {};
    }
    let rows = result.rows;
    let u = {};
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
        uid: rows[0].user_id,
        playername: rows[0].player_name,
        charname: rows[0].char_name,
        email: rows[0].email,
        active: rows[0].active,
        admin: rows[0].admin
      };
    }
    return u;
  },

  updateArticle: async function(artid, content) {
    // Input validation
    artid = parseInt(artid);
    content = valid.sqlText(content);
    if (!content) {
      throw(new Error('Invalid content, aborting update'));
    }
    let qry = "UPDATE articles SET content = '" + content + "'" +
          "WHERE article_id = '" + artid + "'";
    let result = [];
    try {
      result = await _srdb.pg(qry);
      log.logVerbose('srdb.updateArticle: Updated ' + result.rowCount + ' rows');
    } catch(e) {
      log.logError('srdb.updateArticle: Error querying database - ' + qry + ' || ' + e.message);
      return {};
    }
    if (result.rowCount > 0) {
      log.logInfo('srdb.updateArticle: Update successful');
      return true;
    } else {
      log.logInfo('srdb.updateArticle: Update failed, no error');
      return false;
    }
  },

  fetchArticle: async function(artid) {
    let qry = "SELECT tt.title, tt.display_name, ta.article_id, ta.content, tr.rule " +
        "FROM topics AS tt " +
        "JOIN articles AS ta " +
        "ON tt.topic_id = ta.topic_id " +
        "JOIN rules AS tr " +
        "ON tr.article_id = ta.article_id " +
        "WHERE ta.article_id = '" + artid + "'";
    let result = [];
    try {
      result = await _srdb.pg(qry);
      log.logVerbose('srdb.fetchArticle: Received ' + result.rows.length + ' rows');
    } catch(e) {
      log.logError('srdb.fetchArticle: Error querying database - ' + qry + ' || ' + e.message);
      return {};
    }
    let rows = result.rows;
    let article = {};
    if (rows.length > 0) {
      article = {
        title: rows[0].title,
        topic: rows[0].display_name,
        article_id: rows[0].article_id,
        content: rows[0].content,
        rules: [rows[0].rule]
      };
      if (rows.length > 1) {
        for (let aa = 1, len = rows.length; aa < len; aa++) {
          article.rules.push(rows[aa].rule);
        }
      }
    }
    return article;
  },

  fetchUserKeywords: async function(uid) {
    let qry = "SELECT keyword" +
          " FROM user_keywords WHERE user_id = " + uid;
    let result = [];
    try {
      result = await _srdb.pg(qry);
      log.logVerbose('srdb.fetchUserByAuth: Received ' + result.rows.length + ' rows');
    } catch(e) {
      log.logError('srdb.fetchUserByAuth: Error querying database - ' + qry + ' || ' + e.message);
      return null;
    }
    let rows = result.rows;
    let keys = [];
    if (rows.length > 1) {
      for (let i = 0, l = rows.length; i < l; i++) {
        keys.push(rows[i].keyword);
      }
    } else {
      log.logInfo('srdb.fetchUserKeywords: No keywords found');
      return [];
    }
    return keys;
  },

};

module.exports = forExport;
