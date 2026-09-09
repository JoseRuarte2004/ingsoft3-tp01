var express = require("express");
var cors = require("cors");
var passport = require("passport");
var LocalStrategy = require("passport-local").Strategy;
var bcrypt = require("bcrypt");
var db = require("../database");
// Use more salt rounds in production for greater security.
const saltRounds = 10;
const { v4: uuidv4 } = require("uuid");

var router = express.Router();

passport.use(new LocalStrategy(
	function(username, password, done) {
		db.user.findOne({where: { username: username }})
			.then(function(user) {
				if(user){
					bcrypt.compare(password,user.password)
						.then(result => {
							if(result){
								console.log(user);
								// Valid username and password.
								return done(null, user);
							} else {
								// Invalid password.
								return done(null, false, { message: "Incorrect password." });
							}
						});
				} else if(!user){
					// User not found.
					return done(null, false, { message: "User not found." });
				}
			})
			.catch(function(error) {
				// e.g. Database connection error.
				return done(error, false, { message: "Database connection error." });
			});
	}
));


router.post("/register", function (request, response) {
	db.user.findOne({
		where:
			db.sequelize.or(
				{username: request.body.username},
				{email: request.body.email}
			)
	}).then(function(user){
		if(!user) {
			bcrypt.hash(request.body.password, saltRounds, function (error, hash) {
				db.user.create({
					username: request.body.username,
					email: request.body.email,
					password: hash,
					uuid: uuidv4()
				});
			});

			response.send("User creation successful.");
		} else {
			if(user["username"] === request.body.username){
				response.send("An account with that username already exists.");
			}
			else if (user["email"] === request.body.email){
				response.send("An account with that email already exists.");
			}
		}
	})
		.catch(function(error){
			console.log(error);
		});
});

router.post("/login", function(request, response, next){
	console.log("POST request made");
	passport.authenticate("local", {failureFlash:true}, function(error, user, info) {
		if (error) {
			response.send("Error connecting to database.");
		} else if (!user) {
			response.send(info.message);
		} else {
			request.logIn(user, function(error) {
				if (error) { return next(error); }
				response.send("User Authorized");
				request.user = user;
			});
		}
	}) (request,response,next);
});

router.get("/", cors(), function(request, response) {
	if (request.isAuthenticated()){
		db.user.findAll()
			.then(users => {
				console.log(users);
				response.status(200).send(JSON.stringify(users));
			})
			.catch(error => {
				response.status(500).send(JSON.stringify(error));
			});
	} else {
		response.status(403).send("Not authenticated, access is blocked.");
	}
});

module.exports = router;
