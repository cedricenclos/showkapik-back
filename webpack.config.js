module.exports = {
  mode: "production",
  entry: "./src/index.ts",
  output: {
    filename: "server.js"
  },
  target: "node",
  module: {
    rules: [
      {
        test: /\.ts/,
        loader: "ts-loader",
        exclude: /node_modules/
      }
    ]
  },
  resolve: {
    extensions: [".ts", ".js"]
  }
};
