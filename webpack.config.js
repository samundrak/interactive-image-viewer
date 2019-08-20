const path = require('path');

const config = {
  mode: 'production',
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'build'),
    filename: 'iiviewer.js',
    library: 'IIViewers',
    publicPath: './build/',
    libraryTarget: 'this', // universal module definition
  },
  target: 'web', // enum
  performance: {
    hints: 'warning', // enum
    maxAssetSize: 200000, // int (in bytes),
    maxEntrypointSize: 400000, // int (in bytes)
    assetFilter: function(assetFilename) {
      return assetFilename.endsWith('.css') || assetFilename.endsWith('.js');
    },
  },
  resolve: {
    modules: ['node_modules'],
    extensions: ['.js', '.json', '.jsx', '.css'],
    alias: {},
  },
  module: {
    rules: [
      {
        // js loading
        test: /\.js$/,
        exclude: /node_modules\/(?!(auto-bind)\/).*/,
        loader: 'babel-loader',
      },
    ],
  },
};

module.exports = config;
