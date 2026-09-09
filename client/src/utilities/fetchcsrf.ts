const fetchCsrf = async () => {
	const getCsrfResponse = await fetch("/csrf/", {
		method:"get",
		headers: { "Content-Type": "application/json" }
	});
	
	return getCsrfResponse.json();
};

export { fetchCsrf };
