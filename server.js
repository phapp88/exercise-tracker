const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');

dotenv.config();

mongoose.connect(process.env.MLAB, { useNewUrlParser: true });
mongoose.Promise = global.Promise;
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

const UserSchema = new mongoose.Schema({
  exercises: [{
    date: Date,
    description: String,
    duration: Number,
  }],
  username: { type: String, required: true, unique: true },
});

const User = mongoose.model('users', UserSchema);

express()
  .use(express.static('public'))
  .use(bodyParser.urlencoded({ extended: false }))
  .get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')))
  .get('/api/exercise/log', (req, res, next) => {
    const {
      from: fromStr = '', limit = '', to: toStr = '', username,
    } = req.query;
    if (!username) {
      res.send('username not provided');
    } else {
      User.findOne({ username })
        .then((user) => {
          if (user === null) {
            res.send('unknown username');
          } else {
            const { exercises, _id, username: userName } = user;
            const dateRange = [-Infinity, Infinity];
            if (fromStr !== '') {
              const [fromYear, fromMonth, fromDay] = fromStr.split('-').map(Number);
              const fromDate = new Date(fromYear, fromMonth - 1, fromDay);
              if (fromDate.getFullYear() === fromYear
                && fromDate.getMonth() + 1 === fromMonth
                && fromDate.getDate() === fromDay) {
                dateRange[0] = fromDate;
              }
            }
            if (toStr !== '') {
              const [toYear, toMonth, toDay] = toStr.split('-').map(Number);
              const toDate = new Date(toYear, toMonth - 1, toDay);
              if (toDate.getFullYear() === toYear
                && toDate.getMonth() + 1 === toMonth
                && toDate.getDate() === toDay) {
                dateRange[1] = toDate;
              }
            }
            const log = exercises.filter(exercise => (
              dateRange[0] <= exercise.date && exercise.date <= dateRange[1]
            ));
            if (!Number.isNaN(Number(limit)) && limit !== '') {
              log.splice(limit);
            }
            res.json({
              username: userName, _id, count: log.length, log,
            });
          }
        })
        .catch(next);
    }
  })
  .post('/api/exercise/add', (req, res, next) => {
    const {
      date: dateStr, description, duration, username,
    } = req.body;
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = dateStr !== '' ? new Date(year, month - 1, day) : new Date();
    const exercise = { date, description, duration: +duration };
    User.findOneAndUpdate(
      { username },
      { $push: { exercises: exercise } },
    )
      .then((user) => {
        if (user === null) {
          res.send('unknown username');
        } else {
          res.json({
            username,
            _id: user._id, // eslint-disable-line no-underscore-dangle
            date: date.toDateString(),
            description,
            duration: +duration,
          });
        }
      })
      .catch((err) => {
        if (err.name === 'CastError') {
          res.send(`invalid ${err.reason.path}`);
        } else {
          next(err);
        }
      });
  })
  .post('/api/exercise/new-user', (req, res, next) => {
    new User({ username: req.body.username }).save()
      .then((user) => {
        const { _id, username } = user;
        res.json({ username, _id });
      })
      .catch((err) => {
        if (err.code === 11000) {
          res.send('username already taken');
        } else {
          next(err);
        }
      });
  })
  .get('*', (req, res) => res.redirect('/'))
  .listen(process.env.PORT || 3000);
