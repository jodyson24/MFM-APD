const bcrypt = require('bcrypt');

exports.hashToken = async (token) => {
  return bcrypt.hash(token, 10);
};

exports.compareToken = async (plain, hash) => {
  return bcrypt.compare(plain, hash);
};