--Table creation scripts


CREATE TABLE announcements (
  announce_id SERIAL,
  message VARCHAR(255),
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  PRIMARY KEY (announce_id)
);
INSERT INTO announcements (message, start_date, end_date) VALUES  
  ('This game has not yet started, but will someday! (I hope)', '2020-04-25', NULL),
  ('Future test announcement', '2021-04-01', NULL);

CREATE TABLE users (
  user_id SMALLSERIAL,
  player_name VARCHAR(100),
  char_name VARCHAR(100),
  email VARCHAR(100),
  active BOOLEAN,
  admin BOOLEAN,
  PRIMARY KEY (user_id)
);
INSERT INTO users (user_id, player_name, char_name, email, active, admin) VALUES
  (1, 'Wes', 'Storyteller', 'wesc@antitribu.com', TRUE, TRUE),
  (2, 'Testy McTest', 'Dummy', 'something@antitribu.com', TRUE, FALSE);
  
CREATE TYPE provider AS ENUM('google');
CREATE TABLE user_auth (
  user_id INTEGER,
  provider provider,
  key VARCHAR(50),
  PRIMARY KEY (user_id, provider)
);

CREATE TABLE user_keywords (
  user_id INTEGER,
  keyword VARCHAR(50),
  rating INTEGER,
  PRIMARY KEY (user_id, keyword)
);
INSERT INTO user_keywords (user_id, keyword, rating) VALUES
  (9, 'occult', 3),
  (9, 'seven-roses-status', 2);

CREATE TABLE topics (
  topic_id SERIAL,
  title VARCHAR(100) UNIQUE,
  display_name VARCHAR(100),
  PRIMARY KEY (topic_id)
);
CREATE UNIQUE INDEX titles ON topics (title);
INSERT INTO topics (topic_id, title, display_name) VALUES 
  (1, 'seven_roses', 'Seven Roses Consilium'),
  (2, 'portland', 'City of Portland');

CREATE TABLE articles (
  article_id SERIAL,
  topic_id INTEGER,
  content TEXT
  PRIMARY KEY (article_id)
);
CREATE UNIQUE INDEX titles ON topics (title);
INSERT INTO articles (article_id, topic_id, content) VALUES
  (1, 1, 'One can assume that since there are pentacle mages in Portland, they must have formed a consilium, right?'),
  (2, 1, 'The pentacle is in the process of forming a consilium, but they have a ways to go yet.'),
  (3, 2, 'Portland is a pretty cool city. Look at Wikipedia.'),
  (4, 2, 'Some pretty weird stuff happens in Portland, too.');

CREATE TABLE rules (
  rule_id SERIAL,
  article_id INTEGER,
  rule JSON,
  PRIMARY KEY (rule_id)
);
CREATE INDEX by_article ON rules (article_id, rule);
INSERT INTO rules (rule_id, article_id, rule) VALUES
  (1, 1, '{"quality": "occult", "minRating": 1, "maxRating": 2}'),
  (2, 2, '{"quality": "occult", "minRating": 3}'),
  (3, 3, '{"quality": "occult", "minRating": 1}'),
  (4, 4, '{"quality": "occult", "minRating": 3}');

