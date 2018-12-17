'use strict'

var express = require('express');
var PublicactionController = require('../controllers/publication');
var api = express.Router();
var md_auth = require('../middlewares/authenticate');

var multipart = require('connect-multiparty');
var md_upload = multipart({ uploadDir: './uploads/users' });

api.get('/prueba-pub', md_auth.ensureAuth, PublicactionController.Prueba);
api.post('/publication', md_auth.ensureAuth, PublicactionController.SavePublication);
api.get('/publications/:page?', md_auth.ensureAuth, PublicactionController.getPublications);
api.get('/publication/:id?', md_auth.ensureAuth, PublicactionController.getPublication);
api.delete('/publication/:id?', md_auth.ensureAuth, PublicactionController.deletePublication);
api.post('/upload-image-pub/:id', [md_auth.ensureAuth, md_upload], PublicactionController.uploadImage);
api.get('/get-image-pub/:imageFile', PublicactionController.getImageFile);

module.exports = api;