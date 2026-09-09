import React from "react";
import { Route, Switch } from "react-router-dom";
import Authentication from "./authentication/Authentication";
import Inventory from "./inventory/Inventory";

const App = () => {
	return (
		<Switch>
			<Route exact path={"/Authentication"}>
				<Authentication />
			</Route>
			<Route exact path={"/Inventory"}>
				<Inventory />
			</Route>
		</Switch>
	);
};

export default App;
