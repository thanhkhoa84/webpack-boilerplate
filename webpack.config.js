const path = require('path');
const fs = require('fs');
const glob = require('glob');
const WebpackBar = require('webpackbar');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const ImageMinimizerPlugin = require('image-minimizer-webpack-plugin');
const PurgeCssPlugin = require('purgecss-webpack-plugin');

const isDevMode = process.env.NODE_ENV === 'development';
const mode = isDevMode ? 'development' : 'production';

// MODULE LOADER
const pug = {
  test: /\.pug$/,
  exclude: [
    path.resolve(__dirname, 'src/views/layout'),
    path.resolve(__dirname, 'src/views/partials'),
    path.resolve(__dirname, 'src/views/mixins'),
  ],
  use: [
    'html-loader',
    {
      loader: 'pug-html-loader',
      options: {
        pretty: true,
      },
    },
  ],
};
const js = {
  test: /\.js$/,
  loader: 'babel-loader',
};
const scss = {
  test: /\.(scss|sass|css)$/,
  use: [
    isDevMode ? 'style-loader' : MiniCssExtractPlugin.loader,
    {
      loader: 'css-loader',
      options: {
        url: true,
        modules: true,
      },
    },
    { loader: 'postcss-loader' },
    {
      loader: 'resolve-url-loader',
      options: {
        sourceMap: true,
      },
    },
    {
      loader: 'sass-loader',
      options: {
        sourceMap: true,
      },
    },
    { loader: 'import-glob-loader' },
  ],
};
const image = {
  test: /\.(jpeg|jpg|png|gif|svg|bmp)$/i,
  type: 'asset/resource',
  generator: {
    filename: './assets/images/[name][ext]',
  },
};
const font = {
  test: /\.(woff|woff2|eot|ttf|otf)$/i,
  type: 'asset/resource',
  generator: {
    filename: './assets/fonts/[name][ext]',
  },
};
const rules = [pug, js, scss, image, font];

// PLUGINS
const createHtml = function () {
  const pugs = fs
    .readdirSync(path.resolve(__dirname, 'src/views'))
    .filter((f) => /\.pug$/g.test(f));
  return pugs.map((pug) => {
    return new HtmlWebpackPlugin({
      template: `src/views/${pug}`,
      filename: pug.replace('pug', 'html'),
      inject: true,
      minify: false,
    });
  });
};
let plugins = [
  new WebpackBar({
    color: 'orange',
  }),
  ...createHtml(),
];
if (!isDevMode) {
  plugins = [
    ...plugins,
    new MiniCssExtractPlugin({
      filename: './assets/css/[name].css',
    }),
  ];
}

// OPTIMIZATION
const optimization = isDevMode
  ? {}
  : {
      splitChunks: {
        maxInitialRequests: Infinity,
        chunks: 'all',
        minSize: 20000,
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendor',
            chunks: 'all',
          },
        },
      },
      minimize: true,
      minimizer: [
        new TerserPlugin({
          parallel: true,
          terserOptions: {
            format: {
              comments: false,
            },
          },
          extractComments: false,
        }),
        new CssMinimizerPlugin(),
        new PurgeCssPlugin({
          paths: glob.sync(`${path.resolve(__dirname, 'src')}/**/*`, {
            nodir: true,
          }),
          only: ['app'],
          whitelistPatterns: [/css-pattern-to-remove.*/],
        }),
        new ImageMinimizerPlugin({
          minimizerOptions: {
            // Lossless optimization with custom option
            // Feel free to experiment with options for better result for you
            plugins: [
              ['gifsicle', { interlaced: true }],
              ['mozjpeg', { progressive: true, quality: 65 }],
              [
                'pngquant',
                {
                  strip: true,
                  speed: 1,
                  quality: [0.3, 0.5],
                },
              ],
              [
                'svgo',
                {
                  plugins: [
                    {
                      removeViewBox: false,
                    },
                  ],
                },
              ],
            ],
          },
        }),
      ],
    };

module.exports = {
  target: 'web',
  devtool: isDevMode ? 'inline-source-map' : 'source-map',
  mode,
  resolve: {
    extensions: ['*', '.pug', '.js', '.jsx', '.json'],
  },
  entry: {
    app: path.resolve(__dirname, './src/assets/js/index.js'),
  },
  output: {
    path: path.resolve(__dirname, './public'),
    publicPath: 'auto',
    filename: './assets/js/[name].js',
    clean: true,
  },
  module: { rules },
  plugins,
  optimization,
  devServer: {
    contentBase: './public',
    port: 8000,
    hot: true,
  },
};
