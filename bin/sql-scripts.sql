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
INSERT INTO users (player_name, char_name, email, active, admin) VALUES
  ('Wes', 'Storyteller', 'wesc@antitribu.com', TRUE, TRUE);
  

CREATE TYPE provider AS ENUM('google');
CREATE TABLE user_auth (
  user_id INTEGER,
  provider provider,
  key VARCHAR(50),
  PRIMARY KEY (user_id, provider)
);
