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
          options: { 
            presets: [
              "@babel/preset-env", 
              ["@babel/preset-react", { runtime: "automatic" }]
            ] 
          },
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
    headers: {
      "Access-Control-Allow-Origin": "*",
    },
  },
  plugins: [
    new ModuleFederationPlugin({
      name: "inventario",
      filename: "remoteEntry.js",
      exposes: { 
        "./App": "./src/App.jsx",
        './ProductSelector': './src/components/ProductSelector.jsx',
      },
      shared: {
        react: { 
          singleton: true, 
          eager: true,
          requiredVersion: false 
        },
        "react-dom": { 
          singleton: true, 
          eager: true,
          requiredVersion: false 
        },
      },
    }),
    new HtmlWebpackPlugin({ 
      template: path.resolve(__dirname, "index.html") 
    }),
  ],
});