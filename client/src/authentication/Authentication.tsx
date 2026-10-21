import React, { useState, useEffect } from "react";
import { Form, Button, Alert } from "react-bootstrap";
import { useHistory } from "react-router-dom";
import { fetchCsrf } from "../logic/fetchcsrf";

const Authentication = () => {

	const [authMode, setAuthMode] = useState("Register");
	const [csrfToken, setCsrfToken] = useState("");
	const [message, setMessage] = useState("");
	const history = useHistory();

	useEffect(() => {
		fetchCsrf().then((fetchedCsrf) => {
			setCsrfToken(fetchedCsrf.csrfToken);
		});
	}, []);

	const invertAuthMode = () => {
		setMessage("");
		authMode === "Register" ? setAuthMode("Login") : setAuthMode("Register");
	};

	interface AuthFormElements extends HTMLFormControlsCollection {
		formUsername: HTMLInputElement;
		formEmail?: HTMLInputElement;
		formPassword: HTMLInputElement;
	}

	const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
		const form = event.currentTarget;
		event.preventDefault();
		if (form.elements !== null){
			const elements = form.elements as AuthFormElements;
			fetch(`/users/${authMode.toLowerCase()}`, {
				method:"post",
				headers: { "Content-Type": "application/json", "CSRF-Token": csrfToken },
				credentials: "include",
				body: JSON.stringify({
					"username": elements.formUsername.value,
					"email": elements.formEmail ? elements.formEmail.value : undefined,
					"password": elements.formPassword.value
				})
			})
				.then(response => response.text())
				.then(text => {
					if (authMode === "Login" && text === "User Authorized") {
						history.push("/Inventory");
						return;
					}
					if (authMode === "Register" && text === "User creation successful.") {
						setAuthMode("Login");
					}
					setMessage(text);
				})
				.catch(error => setMessage(String(error)));
		}
	};
	return (
		<Form noValidate onSubmit={(event) => handleSubmit(event)}>
			{message && <Alert variant="info">{message}</Alert>}
			{/* Username field */}
			<Form.Group controlId="formUsername">
				<Form.Label>Username</Form.Label>
				<Form.Control required type="text" placeholder="Username" />
			</Form.Group>
			{/* Email address field, only needed to register */}
			{authMode === "Register" &&
				<Form.Group controlId="formEmail">
					<Form.Label>Email address</Form.Label>
					<Form.Control type="email" placeholder="Email address" />
					<Form.Text className="text-muted">
						{"We'll never share your email with anyone else."}
					</Form.Text>
				</Form.Group>
			}
			{/* Password field */}
			<Form.Group controlId="formPassword">
				<Form.Label>Password</Form.Label>
				<Form.Control required type="password" placeholder="Password" />
			</Form.Group>
			{/* Submit button: deshabilitado hasta tener el CSRF token — si no,
			    un submit rápido (un test, o alguien que ya conoce el form)
			    puede salir ANTES de que fetchCsrf() termine, mandando un
			    CSRF-Token vacío y un "invalid csrf token" confuso. */}
			<Button variant="primary" type="submit" disabled={!csrfToken}>
				{authMode}
			</Button>
			<p onClick={invertAuthMode}>{(authMode === "Register") ? "¿Ya tenés cuenta? Iniciá sesión acá." : "¿Necesitás una cuenta? Registrate acá."}</p>
		</Form>
	);
};

export default Authentication;
