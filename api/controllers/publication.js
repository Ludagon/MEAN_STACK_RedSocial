'use strict'

var path = require('path');
var fs = require('fs');
var moment = require('moment');
var mongoosePaginate = require('mongoose-pagination');

var Publication = require('../models/publication');
var User = require('../models/user');
var Follow = require('../models/follow');

function Prueba(req, res) {
    res.status(200).send({
        message: "Hola desde publications"
    });
}

function SavePublication(req, res) {
    var params = req.body;
    var publication = new Publication();

    if (!params.text) {
        return res.status(200).send({
            message: 'Debes enviar un texto'
        });
    }
    publication.text = params.text;
    publication.file = 'null';
    publication.user = req.user.sub;
    publication.created_at = moment().unix();

    publication.save((err, publicationStored) => {
        if (err) {
            return res.status(500).send({
                message: 'Error al guardar la publicacion'
            });
        }
        if (!publicationStored) {
            return res.status(404).send({
                message: 'La publciacion no fue guardada'
            });
        }
        return res.status(200).send({
            publication: publicationStored
        });
    });
}

function getPublications(req, res) {
    var page = 1;
    var userId = req.user.sub;
    if (req.params.page) {
        page = req.params.page;
    }
    var itemsPerPage = 4;
    Follow.find({ user: req.user.sub }).populate('followed').exec().then((follows) => {
        var follows_clean = [];
        follows_clean.push(userId);
        follows.forEach((follow) => {
            follows_clean.push(follow.followed);
        });
        // El operador $in busca dentro del array los usuarios coinciden
        Publication.find({ user: { "$in": follows_clean } }).sort('-created_at').populate('user')
            .paginate(page, itemsPerPage, (err, publications, total) => {
                if (err) {
                    return res.status(500).send({
                        message: 'Error al devolver las publicaciones'
                    });
                }
                if (!publications) {
                    return res.status(404).send({
                        message: 'No hay publicaciones'
                    });
                }
                return res.status(200).send({
                    total_items: total,
                    page: page,
                    pages: Math.ceil(total / itemsPerPage),
                    publications
                });
            });
    }).catch((err) => {
        return res.status(500).send({
            message: 'Error al devolver el seguimiento'
        });
    });
}

function getPublication(req, res) {
    var PublicationId = req.params.id;

    Publication.findById(PublicationId, (err, publication) => {
        if (err) {
            return res.status(500).send({
                message: 'Error al devolver la publicacion'
            });
        }
        if (!publication) {
            return res.status(404).send({
                message: 'No existe la publicacion'
            });
        }
        return res.status(200).send({
            publication
        });
    })
}

function deletePublication(req, res) {
    var publicationId = req.params.id;

    Publication.find({ 'user': req.user.sub, '_id': publicationId }).remove((err) => {
        if (err) {
            return res.status(500).send({
                message: 'Error al borrar publicaciones'
            });
        }
        return res.status(200).send({
            message: 'Publicacion eliminada correctamente'
        });
    });
}

//Subir Ficheros a la publicacion
function uploadImage(req, res) {
    var publicationId = req.params.id;

    if (req.files != null || req.files != undefined) {
        var file_path = req.files.image.path;
        console.log("primero", file_path);

        var file_split = file_path.split('\/');
        console.log("segundo", file_split);

        var file_name = file_split[2];
        console.log("tercero", file_name);

        var ext_split = file_name.split('\.');
        console.log("cuarto", ext_split);

        var file_ext = ext_split[1];
        console.log("quinto", file_ext);

        if (file_ext.toLowerCase() == 'png' || file_ext.toLowerCase() == 'jpg' ||
            file_ext.toLowerCase() == 'jpeg' || file_ext.toLowerCase() == 'gif') {
            Publication.findOne({ 'user': req.user.sub, '_id': publicationId }).exec((err, publication) => {
                if (publication) {
                    //actualizar documento de la publicacion
                    Publication.findByIdAndUpdate(publicationId, { file: file_name }, { new: true }, (err, publicationUpdated) => {
                        if (err) {
                            return res.status(500).send({
                                message: 'Error en la petición'
                            });
                        }
                        if (!publicationUpdated) {
                            return res.status(404).send({
                                message: 'No se ha podido actualizar la publicacion'
                            });
                        }
                        return res.status(200).send({
                            publication: publicationUpdated
                        });
                    });
                } else {
                    return removeFilesOfUploads(res, file_path, 'No tienes permiso para actualizar esta publicacion');
                }
            });
        } else {
            return removeFilesOfUploads(res, file_path, 'Extensión no valida');
        }

    } else {
        return res.status(200).send({ message: 'No se han subido imagenes' });
    }
}

function removeFilesOfUploads(res, file_path, mensaje) {
    fs.unlink(file_path, (err) => {
        return res.status(200).send({ message: mensaje });
    });
}

function getImageFile(req, res) {
    var image_file = req.params.imageFile;
    var path_file = './uploads/publications/' + image_file;

    fs.exists(path_file, (exists) => {
        if (exists) {
            res.sendFile(path.resolve(path_file));
        } else {
            res.status(200).send({ message: 'No existe la imagen' });
        }
    });
}

module.exports = {
    Prueba,
    SavePublication,
    getPublications,
    getPublication,
    deletePublication,
    uploadImage,
    getImageFile
}