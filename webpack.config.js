module.exports = {
  mode: 'production',
  entry: './src/index.ts',
  output: {
    filename: 'server.js',
  },
  target: 'node',
  module: {
    rules: [
      {
        test: /\.ts/,
        loader: 'ts-loader',
        exclude: /node_modules/,
      },
      { test: /\.handlebars$/, loader: 'handlebars-loader' },
    ],
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
}
