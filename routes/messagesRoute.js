// Routes of messages.
const express = require('express');
const { messagesController } = require('../controllers');

const route = express.Router();

route
  .get('/', messagesController.showAll)
  .get('/:messageId([0-9]+)', messagesController.showOne)
  .post('/', messagesController.create);

module.exports = route;