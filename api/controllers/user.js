'use strict'

var bcrypt = require('bcrypt-nodejs');
var User = require('../models/user');
var jwt = require('../services/jwt');
var Follow = require('../models/follow');
var Publication = require('../models/publication');
var mongoosePaginate = require('mongoose-pagination');
var fs = require('fs');
var path = require('path');


//Metodos de prueba 
function home(req, res) {
    res.status(200).send({
        message: 'Hola mundo desde controlador usuario'
    });
}

function pruebas(req, res) {
    res.status(200).send({
        message: 'Accion de prueba'
    });
}

// Registro del usuario
function saveUser(req, res) {
    var params = req.body;
    var user = new User();

    if (params.name && params.surname &&
        params.nick && params.email && params.password) {
        user.name = params.name;
        user.surname = params.surname;
        user.nick = params.nick;
        user.email = params.email;
        user.role = 'ROLE_USER';
        user.image = null;

        //Presenta error si el nick o email viene con la primera letra en mayuscula
        //Controlar usuarios duplicados
        //elimine .toLowerCase() del email y nick (temporalmente)
        User.find({
            $or: [
                { email: user.email },
                { nick: user.nick }
            ]
        }).exec((err, users) => {
            if (err)
                return res.status(500).send({
                    message: 'Error en la peticion de usuario'
                });
            if (users && users.length >= 1) {
                return res.status(200).send({
                    message: 'El usuario ya existe'
                });
            } else {
                //Cifra la contrasena y guardo los datos
                bcrypt.hash(params.password, null, null, (err, hash) => {
                    user.password = hash

                    user.save((err, userStored) => {
                        if (err) {
                            return res.status(500).send({
                                message: 'Error al guardar usuario'
                            });
                        }
                        if (userStored) {
                            res.status(200).send({
                                User: userStored
                            });
                        } else {
                            res.status(404).send({
                                message: 'No se ha registrado el usuario'
                            });
                        }
                    })
                });
            }
        });


    } else {
        res.status(200).send({
            message: 'Envia todos los campos necesarios'
        });
    }
}

// Login
function loginUser(req, res) {
    var params = req.body;

    var email = params.email;
    var password = params.password;

    User.findOne({
        email: email,
    }, (err, user) => {
        if (err) {
            return res.status(500).send({
                message: 'Error en la peticion'
            });
        }
        if (user) {
            bcrypt.compare(password, user.password, (err, check) => {
                if (check) {
                    //Devolver datos de usuario
                    if (params.gettoken) {
                        //generar y devolver el token
                        return res.status(200).send({
                            token: jwt.createToken(user)
                        });
                    } else {

                        user.password = undefined;
                        return res.status(200).send({ user })
                    }
                } else {
                    //devolver error
                    return res.status(400).send({ message: 'El usuario no se ha podido identificar' });
                }
            });
        } else {
            return res.status(400).send({ message: 'El usuario no se ha podido identificar' });
        }

    });
}

//Adquirir datos de un usuario
function getUser(req, res) {
    var userId = req.params.id;

    User.findById(userId, (err, user) => {
        if (err) {
            return res.status(500).send({
                message: 'Error en la petición'
            });
        }
        if (!user) {
            return res.status(404).send({
                message: 'Usuario no existe'
            });
        }
        followThisUser(req.user.sub, userId).then((value) => {
            user.password = undefined;
            return res.status(200).send({
                user,
                following: value.following,
                followed: value.followed,
            });
        });
    });
}

async function followThisUser(identity_user_id, user_id) {
    try {
        var following = await Follow.findOne({ user: identity_user_id, followed: user_id }).exec()
            .then((following) => {
                return following;
            })
            .catch((err) => {
                return handleError(err);
            });
        var followed = await Follow.findOne({ user: user_id, followed: identity_user_id }).exec()
            .then((followed) => {
                return followed;
            })
            .catch((err) => {
                return handleError(err);
            });
        return {
            following: following,
            followed: followed
        }
    } catch (e) {
        console.log(e);
    }
}


//Devolver listado de usuarios paginado
function getUsers(req, res) {
    var identity_user_id = req.user.sub;
    var page = 1;

    if (req.params.page) {
        page = req.params.page;
    }
    var itemsPerPage = 5;

    User.find().sort('_id').paginate(page, itemsPerPage, (err, users, total) => {
        if (err) {
            return res.status(500).send({
                message: 'Error en la petición'
            });
        }
        if (!users) {
            return res.status(404).send({
                message: 'No hay usuarios disponibles'
            });
        }
        followUserIds(identity_user_id).then((value) => {
            return res.status(200).send({
                users,
                users_following: value.following,
                user_follow_me: value.followed,
                total,
                pages: Math.ceil(total / itemsPerPage)
            });
        });
    });
}

async function followUserIds(user_id) {
    var following = await Follow.find({ "user": user_id }).select({ '_id': 0, '__uv': 0, 'user': 0 }).exec().then((follows) => {
        return follows;
    }).catch((err) => {
        return handleerror(err);
    });

    var followed = await Follow.find({ "followed": user_id }).select({ '_id': 0, '__uv': 0, 'followed': 0 }).exec().then((follows) => {
        return follows;
    }).catch((err) => {
        return handleerror(err);
    });

    //Id usuarios que sigo
    var Following = [];

    following.forEach((follow) => {
        Following.push(follow.followed);
    });
    //Id usuarios que me siguen
    var FollowedBy = [];

    followed.forEach((follow) => {
        FollowedBy.push(follow.user);
    });

    return {
        following: Following,
        followed: FollowedBy
    }

}

function getCounters(req, res) {
    let userId = req.user.sub;
    if (req.params.id) {
        userId = req.params.id;
    }
    getCountFollows(userId).then((value) => {
        return res.status(200).send(value);
    })
}

async function getCountFollows(user_id) {
    try {
        var following = await Follow.count({ "user": user_id }).exec().then(count => {
            return count;
        }).catch((err) => {
            return handleError(err);
        });
        var followed = await Follow.count({ "user": user_id }).exec().then(count => {
            return count;
        }).catch((err) => {
            return handleError(err);
        });
        var publications = await Publication.count({ "user": user_id }).exec().then(count => {
            return count;
        }).catch((err) => {
            return handleError(err);
        });

        return {
            following: following,
            followed: followed,
            publications: publications
        }
    } catch (e) {
        console.log(e);
    }

}

//Actualizar datos de un usuario
function updateUser(req, res) {
    var userId = req.params.id;
    var update = req.body;

    // borrar propiedad password
    delete update.password;

    if (userId != req.user.sub) {
        return res.status(500).send({
            message: 'No tiene permiso para actualizar los datos'
        });
    }
    // new : true indica que el metodo solo me devolvera el metodo actualizado.
    User.findByIdAndUpdate(userId, update, { new: true }, (err, userUpdated) => {
        if (err) {
            return res.status(500).send({
                message: 'Error en la peticion'
            });
        }
        if (!userUpdated) {
            return res.status(404).send({
                message: 'No se ha podido actualizar el usuario'
            });
        }
        return res.status(200).send({ user: userUpdated });
    });
}

//Subir imagen de usuario
function uploadImage(req, res) {
    var userId = req.params.id;

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

        if (userId != req.user.sub) {
            return removeFilesOfUploads(res, file_path, 'No tienes permiso para actualizar los datos');
        }

        if (file_ext.toLowerCase() == 'png' || file_ext.toLowerCase() == 'jpg' ||
            file_ext.toLowerCase() == 'jpeg' || file_ext.toLowerCase() == 'gif') {
            //actualizar documento de usuario logueado
            User.findById(userId, (err, user) => {
                if (err) {
                    return res.status(500).send({
                        message: 'Error en la petición'
                    });
                }
                if (!user) {
                    return res.status(404).send({
                        message: 'Usuario no existe'
                    });
                }
                if (user.image != null) {
                    var userFilePath = "uploads/users/" + user.image;
                    fs.unlink(userFilePath, (err) => {
                        if (err) return res.status(500).send({
                            message: 'Error en la peticion'
                        });
                        console.log('Se ha borrado correctamente la imagen anterior del usuario')
                    });
                }

            })
            User.findByIdAndUpdate(userId, { image: file_name }, { new: true }, (err, userUpdated) => {
                if (err) return res.status(500).send({ message: 'Error en la petición' });

                if (!userUpdated) return res.status(404).send({ message: 'No se ha podido actualizar el usuario' });

                return res.status(200).send({ user: userUpdated });
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
    var path_file = './uploads/users/' + image_file;

    fs.exists(path_file, (exists) => {
        if (exists) {
            res.sendFile(path.resolve(path_file));
        } else {
            res.status(200).send({ message: 'No existe la imagen' });
        }
    });
}

module.exports = {
    home,
    pruebas,
    saveUser,
    loginUser,
    getUser,
    getUsers,
    getCounters,
    updateUser,
    uploadImage,
    getImageFile
}