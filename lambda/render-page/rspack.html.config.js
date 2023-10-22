const path = require('path');

/**
 * @type {import('@rspack/cli').Configuration}
 */
module.exports = {
	mode: "development",
	context: __dirname,
	externals: {
		'jsdom': 'jsdom'
	},
	builtins: {
		react: {
			importSource: 'preact'
		},
	},
	target: 'web',
	entry: {
		// "render-page/jsx-test": "./render-page/jsx-test.tsx",
		"assets/css/style": "./render-page/style.scss"
	},
	output: {
		path: path.resolve(__dirname, './../dist/lambda'),
		filename: '[name].js',
		cssFilename: '[name].css',
	},
	module: {
    rules: [
      {
        test: /\.scss$/,
				loader: 'sass-loader',
        type: 'css',
      },
    ],
  },
};
