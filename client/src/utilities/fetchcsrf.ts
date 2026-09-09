interface CsrfResponse {
	csrfToken: string;
}

const fetchCsrf = async (): Promise<CsrfResponse> => {
	const getCsrfResponse = await fetch("/csrf/", {
		method:"get",
		headers: { "Content-Type": "application/json" }
	});

	return getCsrfResponse.json();
};

export { fetchCsrf };
