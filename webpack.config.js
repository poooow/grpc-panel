const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
    entry: {
        devtools: './src/devtools.ts',
        panel: './src/panel.ts',
    },
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].js',
        clean: true,
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
            {
                test: /\.scss$/,
                use: [
                    'style-loader',
                    'css-loader',
                    {
                        loader: 'sass-loader',
                        options: {
                            api: 'modern',
                        },
                    }
                ],
            },
        ],
    },
    resolve: {
        extensions: ['.ts', '.js'],
    },
    plugins: [
        new CopyPlugin({
            patterns: [
                { from: 'src/manifest.json', to: 'manifest.json' },
                { from: 'images', to: 'images', noErrorOnMissing: true },
            ],
        }),
        new HtmlWebpackPlugin({
            template: './src/devtools.html',
            filename: 'devtools.html',
            chunks: ['devtools'],
            inject: 'body',
        }),
        new HtmlWebpackPlugin({
            template: './src/panel.html',
            filename: 'panel.html',
            chunks: ['panel'],
            inject: 'body',
        }),
    ],
};
