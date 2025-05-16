const path = require('path');

module.exports = {
  entry: './src/getGQLFilter.js',
  target: 'node',
  mode: 'production',
  optimization: {
    minimize: false,
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'getGQLFilter.js',
    libraryTarget: 'commonjs2',
  },
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              ['@babel/preset-env', { modules: 'commonjs' }] // Force CommonJS
            ]
          }
        }
      }
    ]
  },
  experiments: {
    outputModule: false, // Ensure no ES module output
  },
  resolve: {
    extensions: ['.js', '.jsx']
  }
};