const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const webpack = require('webpack');

module.exports = {
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'build'),
    filename: 'widget.js',
    publicPath: process.env.NODE_ENV === 'production' 
      ? 'https://d129jv2av2liy7.cloudfront.net/' 
      : 'http://localhost:5173/'
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env', '@babel/preset-react'],
          },
        },
      },
      {
        test: /\.css$/,
        use: [
          // Use style-loader for development for hot reloading
          process.env.NODE_ENV === 'production' 
            ? MiniCssExtractPlugin.loader 
            : 'style-loader',
          {
            loader: 'css-loader',
            options: {
              importLoaders: 1,
            }
          },
          {
            loader: 'postcss-loader',
            options: {
              postcssOptions: {
                config: path.resolve(__dirname, 'postcss.config.js'),
              },
            },
          }
        ],
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif|ico)$/,
        exclude: /node_modules/,
        use: ['file-loader?name=[name].[ext]']
      }
    ],
  },
  plugins: [
    new CleanWebpackPlugin(),
    new HtmlWebpackPlugin({
      template: './public/index.html',
      filename: '../index.html',
    }),
    new MiniCssExtractPlugin({
      filename: '../css/[name].[contenthash].css',
      chunkFilename: '../css/[id].[contenthash].css',
      ignoreOrder: false,
    }),
  ],
  optimization: {
    minimizer: [
      new TerserPlugin({
        extractComments: false,
      }),
    ],
  },
  resolve: {
    extensions: ['.js', '.jsx', '.json']
  },
  mode: process.env.NODE_ENV || 'production',
};