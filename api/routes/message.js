'use strict'

var express = require('express');
var MessageController = require('../controllers/message');
var api = express.Router();
var md_auth = require('../middlewares/authenticate');

api.get('/probando-message', md_auth.ensureAuth, MessageController.prueba);
api.post('/message', md_auth.ensureAuth, MessageController.saveMessage);
api.get('/My-messages/:page', md_auth.ensureAuth, MessageController.getReceivedMessages);

module.exports = api;