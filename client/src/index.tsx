import React from "react";
import ReactDOM from "react-dom";
import { BrowserRouter as Router } from "react-router-dom";
import * as Sentry from "@sentry/react";
import App from "./App";
import reportWebVitals from "./reportWebVitals";

// El DSN de un front no es secreto: solo sirve para ENVIAR datos, no para
// leerlos, y cualquier app web lo expone porque viaja en el JS que baja al
// navegador. Por eso va escrito acá y no como variable de entorno.
Sentry.init({
	dsn: "https://c137afe2f80fba7d846468437fffa9f1@o4512289087815680.ingest.us.sentry.io/4512294165348352",
	environment: window.location.hostname,
	integrations: [Sentry.browserTracingIntegration()],
	tracesSampleRate: 1.0,
});

ReactDOM.render(
	<React.StrictMode>
		<Router>
			<App />
		</Router>
	</React.StrictMode>,
	document.getElementById("root")
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
