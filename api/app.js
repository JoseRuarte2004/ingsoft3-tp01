require("dotenv").config();
const express = require("express");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const cors = require("cors");
const bodyParser = require("body-parser");
const passport = require("passport");
const session = require("cookie-session");
const helmet = require("helmet");
const hpp = require("hpp");
const csrf = require("csurf");
const limiter = require("express-rate-limit");


const csrfToken = require("./routes/csrf");
const db = require("./database");
const productsRouter = require("./routes/products");
const usersRouter = require("./routes/users");

const app = express();

app.use(helmet());
app.use(hpp());
app.use(limiter());
app.use(cors({ credentials: true }));
app.use(logger("dev"));
app.use(express.json());
app.use(bodyParser.urlencoded({extended:true}));
app.use(bodyParser.json({extended:true}));
app.use(bodyParser.text({extended:true}));
app.use(cookieParser(process.env.COOKIE_PARSER_SECRET));

app.use(session({
	resave: false,
	name: "session",
	secret: process.env.SESSION_SECRET,
	expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
	cookie: {
		httpOnly: false,
		secure: false,
	}
}));	

app.use(csrf({cookie: {
	httpOnly: true,
}}));

app.use(passport.initialize());
app.use(passport.session());
	
passport.serializeUser(function(user, done) {
	done(null, {"id":user.id, "uuid":user.uuid});
});
	
passport.deserializeUser(function(userIds, done) {
	db.user.findByPk(userIds.id)
		.then(user => done(null, user));
});
	
app.use("/csrf", csrfToken);
app.use("/users", usersRouter);
app.use("/products", productsRouter);
	
if(process.env.NODE_ENV === "production") {
	app.use(express.static(__dirname.replace("/api","/client/build")));
	app.get("*", (request, response) => { response.sendFile(__dirname.replace("api","client/build/index.html")); });
}

module.exports = app;
