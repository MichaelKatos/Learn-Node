const express = require('express');
const router = express.Router();

// Do work here
router.get('/', (req, res) => {
  res.send('Hey! It works!');
});

router.get('/test', (req, res) => {
  const wes = { name: 'Wes', age: 100, cool: true };

  res.render('hello');
});

module.exports = router;
