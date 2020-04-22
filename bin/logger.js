
const logger = {
  logLevel: 5,
  module: '',
  ffunct: '',
  env: '',

  setLevel: function(lvl) {
    logger.logLevel = lvl;
  },

  setEnvironment: function(env) {
    logger.env = env;
  },
  
  setModule: function(mod) {
    logger.module = mod;
    logger.log('Initiating Module ' + mod, 8);
  },

  setFunction: function(ffunct) {
    logger.ffunct = ffunct;
    logger.log('Entering Function', 8);
  },

  log: function(msg, lvl) {
    let out = '>>';
    if (!lvl || lvl <= logger.logLevel) {
      if (logger.ffunct) {
        out += '/' + logger.ffunct;
      }
      out += ': ' + msg;
      console.log(out);
    }
  }
};

module.exports = logger;
