//permite usar nuevas caracteristicas de JS
'use strict'

var mongoose = require('mongoose');
var app = require('./app');
var port = 3800;

mongoose.Promise = global.Promise;
mongoose.connect('mongodb://localhost:27017/curso_mean_social', { useNewUrlParser: true })
    .then(() => {
        console.log("Se ha establecido la conexion a la BD");

        //crear servidor
        app.listen(port, () => {
            console.log("Servidor corriendo en puerto 3800");
        });
    })
    .catch(err => console.log(err));