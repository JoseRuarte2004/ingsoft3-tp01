module.exports = {
	env: {
		browser: true,
		es2020: true,
		node: true
	},
	extends: [
		"eslint:recommended",
		"plugin:react/recommended",
		"plugin:jsdoc/recommended"
	],
	overrides: [
		{
			files: ["**/*.ts", "**/*.tsx"],
			extends: [
				"eslint:recommended",
				"plugin:react/recommended",
				"plugin:@typescript-eslint/eslint-recommended",
				"plugin:@typescript-eslint/recommended",
				"plugin:jsdoc/recommended"
			],
			parser: "@typescript-eslint/parser",
			parserOptions: {
				ecmaFeatures: { jsx: true },
				ecmaVersion: 2020,
				sourceType: "module",
				project: "client/tsconfig.json"
			},
			plugins: ["react", "@typescript-eslint"]
		}
	],
	parserOptions: {
		ecmaFeatures: {
			jsx: true
		},
		ecmaVersion: 2020,
		sourceType: "module"
	},
	rules: {
		indent: ["error", "tab"],
		"linebreak-style": ["error", "unix"],
		quotes: ["error", "double"],
		semi: ["error", "always"],
		"object-curly-spacing": [1, "always"],
		"no-multi-spaces": 1,
		"no-extra-semi": 1,
		"operator-linebreak": [1, "after"],
		"brace-style": [1, "1tbs"],
		"comma-dangle": [1, "never"],
		"comma-spacing": [1, { before: false, after: true }],
		"curly": [1, "all"],
		"eol-last": [1, "always"],
		camelcase: [1, { properties: "always" }],
		"multiline-ternary": [1, "always-multiline"],
		"eqeqeq": [1, "always"],
		"no-mixed-spaces-and-tabs": [1, "smart-tabs"],
		"lines-around-comment": [1, { "beforeBlockComment": true }],
		"react/react-in-jsx-scope": "off",
		"valid-jsdoc": [
			1,
			{
				requireParamDescription: true,
				requireReturnDescription: true,
				requireReturn: true
			}
		]
	}
};
