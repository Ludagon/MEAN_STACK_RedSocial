'use strict'

var express = require ('express');
var FollowControler = require ('../controllers/follow');
var api = express.Router();
var md_auth = require('../middlewares/authenticate');

api.post('/follow', md_auth.ensureAuth, FollowControler.SaveFollow);
api.delete('/follow/:id', md_auth.ensureAuth, FollowControler.deleteFollow);
api.get('/following/:id?/:page?', md_auth.ensureAuth, FollowControler.getFollowingUsers);
api.get('/followed/:id?/:page?', md_auth.ensureAuth, FollowControler.getFollowedUsers);
api.get('/get-my-follows/:followed?', md_auth.ensureAuth, FollowControler.getMyFollows);
module.exports = api;