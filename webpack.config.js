var path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')

module.exports = {
  mode: 'development',
  entry: {
    location_scatter: './src/location_scatter/location_scatter.js',
    hex_map: './src/hex_map/hex_map.js',
    quadrant_scatter: './src/quadrant_scatter/quadrant_scatter.js'
  },
  devServer: {
    https: true,
    contentBase: path.join(__dirname, 'dist'),
    port: 9000
  },
  output: {
    path: path.join(__dirname, "dist"),
    filename: "[name]/[name].js",
    library: "[name]",
    libraryTarget: "umd"
  },
  resolve: {
    extensions: [".js"]
  },
  module: {
    rules: [
      { test: /\.js$/, loader: "babel-loader" }
    ]
  }
}
