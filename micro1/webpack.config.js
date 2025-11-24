import path from "path";
import { fileURLToPath } from "url";
import HtmlWebpackPlugin from "html-webpack-plugin";
import webpack from "webpack";

const {
  container: { ModuleFederationPlugin },
} = webpack;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default (env, argv) => ({
  entry: path.resolve(__dirname, "src", "main.jsx"),
  mode: argv?.mode || "development",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "[name].[contenthash].js",
    publicPath: "auto",
    clean: true,
  },
  resolve: { extensions: [".js", ".jsx"] },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: { presets: ["@babel/preset-env", "@babel/preset-react"] },
        },
      },
      { test: /\.css$/i, use: ["style-loader", "css-loader"] },
      { test: /\.(png|jpe?g|gif|svg)$/i, type: "asset/resource" },
    ],
  },
  devServer: {
    port: 3001,
    historyApiFallback: true,
    static: { directory: path.join(__dirname, "public") },
    hot: true,
  },
  plugins: [
    new ModuleFederationPlugin({
      name: "micro1",
      filename: "remoteEntry.js",
      exposes: { "./App": "./src/App" },
      shared: {
        react: { singleton: true, requiredVersion: false },
        "react-dom": { singleton: true, requiredVersion: false },
      },
    }),
    new HtmlWebpackPlugin({ template: path.resolve(__dirname, "index.html") }),
  ],
});
