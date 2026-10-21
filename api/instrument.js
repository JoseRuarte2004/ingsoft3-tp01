const Sentry = require("@sentry/node");

// Si SENTRY_DSN no está (local, tests, QA sin la variable cargada), el SDK
// queda inactivo solo y la app sigue andando igual.
Sentry.init({
	dsn: process.env.SENTRY_DSN,
	tracesSampleRate: 1.0,
});
