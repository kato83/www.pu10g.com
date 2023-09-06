const path = require('path');

/**
 * @type {import('@rspack/cli').Configuration}
 */
module.exports = {
	mode: "development",
	context: __dirname,
	externals: {
		'aws-sdk': 'aws-sdk',
		// JSDOMで以下3つの依存解決エラーが出るが、現状影響はないのでexternalsで静める
		'canvas': 'canvas',
		'utf-8-validate': 'utf-8-validate',
		'bufferutil': 'bufferutil'
	},
	builtins: {
		react: {
			importSource: 'preact'
		},
	},
	target: 'node',
	entry: {
		"dynamo-crud/dynamo-crud": "./dynamo-crud/dynamo-crud.ts",
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
