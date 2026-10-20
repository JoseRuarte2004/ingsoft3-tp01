import React, { useEffect, useState } from "react";
import { Table, Form, Button, Row, Col, Alert } from "react-bootstrap";
import { useHistory } from "react-router-dom";
import { fetchCsrf } from "../utilities/fetchcsrf";

interface Product {
	id: number;
	name: string;
	quantity: number;
	expiryDate: string;
	storageLocation: string;
	freezable: boolean;
}

const emptyForm = {
	name: "",
	quantity: 1,
	expiryDate: "",
	storageLocation: "",
	freezable: false
};

const Inventory = (): JSX.Element => {
	const history = useHistory();

	const [userProducts, setUserProducts] = useState<Product[]>([]);
	const [csrfToken, setCsrfToken] = useState("");
	const [form, setForm] = useState(emptyForm);
	const [editingId, setEditingId] = useState<number | null>(null);
	const [message, setMessage] = useState("");

	const loadProducts = () => {
		fetch("/products", {
			credentials: "include"
		})
			.then((response) => {
				if (response.status === 403) {
					history.push("/Authentication");
					return [];
				}
				return response.json();
			})
			.then((parsedProducts) => {
				setUserProducts(parsedProducts || []);
			})
			.catch((error) => setMessage(String(error)));
	};

	useEffect(() => {
		fetchCsrf().then((fetchedCsrf) => setCsrfToken(fetchedCsrf.csrfToken));
		loadProducts();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const resetForm = () => {
		setForm(emptyForm);
		setEditingId(null);
	};

	const handleFieldChange = (field: keyof typeof emptyForm, value: string | number | boolean) => {
		setForm({ ...form, [field]: value });
	};

	const handleSubmit = (event: React.FormEvent) => {
		event.preventDefault();
		const isEditing = editingId !== null;
		const url = isEditing ? `/products/${editingId}` : "/products";
		const method = isEditing ? "PUT" : "POST";

		fetch(url, {
			method,
			headers: { "Content-Type": "application/json", "CSRF-Token": csrfToken },
			credentials: "include",
			body: JSON.stringify({ ...form, expiryDate: form.expiryDate || null })
		})
			.then((response) => {
				if (response.status === 403) {
					history.push("/Authentication");
					return;
				}
				if (!response.ok) {
					setMessage(`No se pudo guardar el producto (status ${response.status}).`);
					return;
				}
				resetForm();
				setMessage(isEditing ? "Producto actualizado." : "Producto creado.");
				loadProducts();
			})
			.catch((error) => setMessage(String(error)));
	};

	const handleEdit = (product: Product) => {
		setEditingId(product.id);
		setForm({
			name: product.name,
			quantity: product.quantity,
			expiryDate: product.expiryDate || "",
			storageLocation: product.storageLocation,
			freezable: product.freezable
		});
	};

	const handleDelete = (id: number) => {
		fetch(`/products/${id}`, {
			method: "DELETE",
			headers: { "CSRF-Token": csrfToken },
			credentials: "include"
		})
			.then((response) => {
				if (response.status === 403) {
					history.push("/Authentication");
					return;
				}
				if (!response.ok) {
					setMessage(`No se pudo eliminar el producto (status ${response.status}).`);
					return;
				}
				if (editingId === id) {
					resetForm();
				}
				setMessage("Producto eliminado.");
				loadProducts();
			})
			.catch((error) => setMessage(String(error)));
	};

	const handleLogout = () => {
		fetch("/users/logout", {
			method: "POST",
			headers: { "CSRF-Token": csrfToken },
			credentials: "include"
		}).then(() => history.push("/Authentication"));
	};

	return (
		<div>
			<Row className="align-items-center">
				<Col><h2>Inventory</h2></Col>
				<Col xs="auto"><Button variant="outline-secondary" onClick={handleLogout}>Cerrar sesión</Button></Col>
			</Row>

			{message && <Alert variant="info" onClose={() => setMessage("")} dismissible>{message}</Alert>}

			<Form onSubmit={handleSubmit} className="mb-4">
				<Row>
					<Col>
						<Form.Group controlId="formName">
							<Form.Label>Name</Form.Label>
							<Form.Control required type="text" value={form.name}
								onChange={(e) => handleFieldChange("name", e.target.value)} />
						</Form.Group>
					</Col>
					<Col>
						<Form.Group controlId="formQuantity">
							<Form.Label>Quantity</Form.Label>
							<Form.Control required type="number" min={0} value={form.quantity}
								onChange={(e) => handleFieldChange("quantity", Number(e.target.value))} />
						</Form.Group>
					</Col>
					<Col>
						<Form.Group controlId="formExpiryDate">
							<Form.Label>Expiry Date</Form.Label>
							<Form.Control type="date" value={form.expiryDate}
								onChange={(e) => handleFieldChange("expiryDate", e.target.value)} />
						</Form.Group>
					</Col>
					<Col>
						<Form.Group controlId="formStorageLocation">
							<Form.Label>Storage Location</Form.Label>
							<Form.Control required type="text" value={form.storageLocation}
								onChange={(e) => handleFieldChange("storageLocation", e.target.value)} />
						</Form.Group>
					</Col>
					<Col xs="auto">
						<Form.Group controlId="formFreezable">
							<Form.Label>Freezable</Form.Label>
							<Form.Check type="checkbox" checked={form.freezable}
								onChange={(e) => handleFieldChange("freezable", e.target.checked)} />
						</Form.Group>
					</Col>
					<Col xs="auto" className="d-flex align-items-end">
						<Form.Group>
							<Button variant="primary" type="submit">{editingId !== null ? "Guardar" : "Agregar"}</Button>
							{editingId !== null &&
								<Button variant="link" onClick={resetForm}>Cancelar</Button>
							}
						</Form.Group>
					</Col>
				</Row>
			</Form>

			<Table striped bordered hover>
				<thead>
					<tr>
						<th>Name</th>
						<th>Quantity</th>
						<th>Expiry Date</th>
						<th>Storage Location</th>
						<th>Freezable</th>
						<th></th>
					</tr>
				</thead>
				<tbody>
					{userProducts.map((item) => (
						<tr key={item.id}>
							<td>{item.name}</td>
							<td>{item.quantity}</td>
							<td>{item.expiryDate}</td>
							<td>{item.storageLocation}</td>
							<td>{item.freezable ? "Yes" : "No"}</td>
							<td>
								<Button size="sm" variant="outline-primary" onClick={() => handleEdit(item)}>Editar</Button>{" "}
								<Button size="sm" variant="outline-danger" onClick={() => handleDelete(item.id)}>Eliminar</Button>
							</td>
						</tr>
					))}
				</tbody>
			</Table>
		</div>
	);
};

export default Inventory;
