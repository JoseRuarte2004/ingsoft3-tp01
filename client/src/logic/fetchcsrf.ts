interface CsrfResponse {
	csrfToken: string;
}

const fetchCsrf = async (fetchFn: typeof fetch = fetch): Promise<CsrfResponse> => {
	const getCsrfResponse = await fetchFn("/csrf/", {
		method:"get",
		headers: { "Content-Type": "application/json" }
	});

	return getCsrfResponse.json();
};

export { fetchCsrf };
