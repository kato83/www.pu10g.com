const path = require('path');

/**
 * @type {import('@rspack/cli').Configuration}
 */
module.exports = {
	mode: "development",
	context: __dirname,
	externals: {
		'aws-sdk': 'aws-sdk',
	},
	builtins: {
    react: {
			importSource: 'preact'
    },
  },
	target: 'node',
	entry: {
		"dynamo-content/dynamo-content": "./dynamo-content/dynamo-content.ts",
		"basic-auth/basic-auth": "./basic-auth/basic-auth.ts",
		"render-page/render-page": "./render-page/render-page.tsx"
	},
	output: {
		path: path.resolve(__dirname, './../dist/lambda'),
		filename: '[name].js',
		library: {
			type: 'commonjs'
		},
	}
};
