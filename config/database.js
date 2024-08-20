require('dotenv').config();

const mongoString = process.env.DATABASE_URL

module.exports = {
    url: mongoString
  };