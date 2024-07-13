const path = require('path');

module.exports = {
  mode: 'development', // yoki 'production'
  entry: './components/ShowImage.tsx',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'ShowImage.bundle.js',
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
};
  