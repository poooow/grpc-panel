const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = (env) => {
    const target = env.target || 'chrome';
    const distPath = path.resolve(__dirname, 'dist', target);
    const manifestFile = target === 'firefox' ? 'src/manifest.firefox.json' : 'src/manifest.json';

    return {
        entry: {
            devtools: './src/devtools.ts',
            panel: './src/panel.ts',
        },
        output: {
            path: distPath,
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
                    { from: manifestFile, to: 'manifest.json' },
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
};
