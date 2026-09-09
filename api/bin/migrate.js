var db = require('../database.js');
db.sequelize.sync({alter:true});