var mongoose = require("mongoose");
var Schema = mongoose.Schema;

var UsersSchema = new Schema({
    id: String,
    name: String,
    password: String
},{ collection: 'Users' });

module.exports = mongoose.model('Users', UsersSchema);
