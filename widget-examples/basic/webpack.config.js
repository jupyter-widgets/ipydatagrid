const rules = [
  { test: /\.ts$/, loader: 'ts-loader' },
  { test: /\.js$/, loader: 'source-map-loader' },
  { test: /\.css$/, use: ['style-loader', 'css-loader'] },
  { test: /\.(jpg|png|gif)$/, use: ['file-loader'] },
  {
    test: /\.svg(\?v=\d+\.\d+\.\d+)?$/,
    issuer: /\.css$/,
    use: {
      loader: 'svg-url-loader',
      options: { encoding: 'none', limit: 10000 },
    },
  },
];

const resolve = {
  extensions: ['.webpack.js', '.web.js', '.ts', '.js'],
};

module.exports = [
  {
    entry: './index.ts',
    mode: 'development',
    optimization: {
      minimize: false,
    },
    output: {
      path: __dirname + '/lib/build/',
      filename: 'bundle.example.js',
      publicPath: './lib/build/',
    },
    module: {
      rules: rules,
    },
    resolve,
  },
];
