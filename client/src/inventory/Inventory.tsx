import React, { useEffect, useState } from "react";
import { Table } from "react-bootstrap";
// import { useCookies } from "react-cookie";

const Inventory = (): JSX.Element => {
	// const [sessionCookie] = useCookies();
	// console.log(sessionCookie);

	type userProducts = [
		{
			name: string;
			quantity: number;
			expiryDate: string;
			storageLocation: string;
			freezable: boolean | null;
		}
	];

	const [userProducts, setUserProducts] = useState<userProducts>();

	useEffect(() => {
		fetch("/products", {
			credentials: "include"
		})
			.then((response) => {
				return response.json();
			})
			.then((parsedProducts) => {
				setUserProducts(parsedProducts);
			})
			.catch((error) => console.log(error));
	}, []);

	return (
		<Table striped bordered hover>
			<thead>
				<tr>
					<th>Name</th>
					<th>Quantity</th>
					<th>Expiry Date</th>
					<th>Storage Location</th>
					<th>Freezable</th>
				</tr>
			</thead>
			{userProducts &&
					userProducts.map((item) => (
						<>
							<tbody>
								<tr>
									<td>{item["name"]}</td>
									<td>{item["quantity"]}</td>
									<td>{item["expiryDate"]}</td>
									<td>{item["storageLocation"]}</td>
									<td>{item["freezable"]}</td>
								</tr>
							</tbody>
						</>
					  ))
			}
		</Table>
	);
};

export default Inventory;
