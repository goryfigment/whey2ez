const webpack = require('webpack');
const path = require("path");
const UglifyJSPlugin = require('uglifyjs-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const BundleTracker = require('webpack-bundle-tracker');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const glob = require('glob-all');
const PurifyCSSPlugin = require('purifycss-webpack');

module.exports = {
    //context: __dirname,
    entry: {
        //404: './templates/js/error.js',
        //500: './templates/js/error.js',
        register: './templates/js/register.js',
        login: './templates/js/login.js',
        overview: './templates/js/overview.js',
        inventory: './templates/js/inventory.js',
        employee: './templates/js/employee.js',
        store: './templates/js/store.js',
        transaction: './templates/js/transaction.js',
        create_transaction: './templates/js/create_transaction.js'
    },
    output: {path: __dirname + '/templates/bundle', filename: 'js/[name].js', publicPath: '/templates/bundle/'},
    module: {
        loaders: [
            {test: /\.css$/, loader: ExtractTextPlugin.extract({use: ['css-loader', 'postcss-loader'], publicPath: '../'})},
            //{test: /\.(eot|svg|ttf|woff|woff2)$/, loader: 'file-loader?name=assets/fonts/[name].[ext]'},
            //{test: /\.(jpe?g|png|gif|svg)$/i, loader: ["file-loader?name=../../[path][name].[ext]", 'image-webpack-loader']},
            {test: /\.hbs$/, loader: 'handlebars-loader', options:{helperDirs: path.resolve(__dirname, "./templates/handlebars/helpers")}}
        ]
    },
    plugins: [
        new BundleTracker({filename: './webpack-stats.json'}),
        new ExtractTextPlugin('css/[name].css'),
        new webpack.optimize.CommonsChunkPlugin('vendors'),
        //new UglifyJSPlugin({mangle: {except: ['$super', '$', 'exports', 'require']}, extractComments: true}),

        //Purify CSS
        //new PurifyCSSPlugin({paths: glob.sync([path.join(__dirname, 'templates/*.html'), path.join(__dirname, 'templates/partials/*.html')]), minimize: true,
        //    purifyOptions: {whitelist: []}
        //}),

        //HTML
        //new HtmlWebpackPlugin({filename: '404.html', chunks: ['vendors','error'], minify: {collapseWhitespace: true}, hash: true, template: './templates/404.html'}),
        //new HtmlWebpackPlugin({filename: '500.html', chunks: ['vendors','error'], minify: {collapseWhitespace: true}, hash: true, template: './templates/500.html'}),
        new HtmlWebpackPlugin({filename: 'register.html', chunks: ['vendors','register'], minify: {collapseWhitespace: true}, hash: true, template: './templates/register.html'}),
        new HtmlWebpackPlugin({filename: 'login.html', chunks: ['vendors','login'], minify: {collapseWhitespace: true}, hash: true, template: './templates/login.html'}),
        new HtmlWebpackPlugin({filename: 'overview.html', chunks: ['vendors','overview'], minify: {collapseWhitespace: true}, hash: true, template: './templates/overview.html'}),
        new HtmlWebpackPlugin({filename: 'inventory.html', chunks: ['vendors','inventory'], minify: {collapseWhitespace: true}, hash: true, template: './templates/inventory.html'}),
        new HtmlWebpackPlugin({filename: 'employee.html', chunks: ['vendors','employee'], minify: {collapseWhitespace: true}, hash: true, template: './templates/employee.html'}),
        new HtmlWebpackPlugin({filename: 'store.html', chunks: ['vendors','store'], minify: {collapseWhitespace: true}, hash: true, template: './templates/store.html'}),
        new HtmlWebpackPlugin({filename: 'transaction.html', chunks: ['vendors','transaction'], minify: {collapseWhitespace: true}, hash: true, template: './templates/transaction.html'}),
        new HtmlWebpackPlugin({filename: 'create_transaction.html', chunks: ['vendors','create_transaction'], minify: {collapseWhitespace: true}, hash: true, template: './templates/create_transaction.html'}),
    ],
    resolve: {
        alias: {
           handlebars: 'handlebars/dist/handlebars.min.js'
        }
    }
};