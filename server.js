const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');

dotenv.config();

mongoose.connect(process.env.MLAB);
mongoose.Promise = global.Promise;
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

const UserSchema = new mongoose.Schema({
  exercises: [{
    date: String,
    description: String,
    duration: String,
  }],
  username: String,
});

const User = mongoose.model('users', UserSchema);

express()
  .use(bodyParser.urlencoded({ extended: false }))
  .get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')))
  .post('/api/exercise/new-user', (req, res, next) => {
    const { username } = req.body;
    const user = new User({ username });
    user.save()
      .then(json => res.json(json))
      .catch(next);
  })
  .listen(process.env.PORT || 3000);
