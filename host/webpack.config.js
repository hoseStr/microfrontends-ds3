import path from "path";
import { fileURLToPath } from "url";
import HtmlWebpackPlugin from "html-webpack-plugin";
import webpack from "webpack";

const { container: { ModuleFederationPlugin } } = webpack;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default (env, argv) => {
  const isProd = argv?.mode === "production";

  // Base URL para los remotes
  const REMOTE_BASE = process.env.REMOTE_BASE || "http://localhost";

  return {
    entry: path.resolve(__dirname, "src", "main.jsx"),
    mode: isProd ? "production" : "development",
    output: {
      path: path.resolve(__dirname, "dist"),
      filename: "[name].[contenthash].js",
      publicPath: "auto",
      clean: true,
    },
    resolve: {
      extensions: [".js", ".jsx", ".json"],
    },
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
                ["@babel/preset-react", { runtime: "automatic" }],
              ],
            },
          },
        },
        { test: /\.css$/i, use: ["style-loader", "css-loader"] },
        { test: /\.(png|jpe?g|gif|svg)$/i, type: "asset/resource" },
      ],
    },
    devServer: {
      port: 3000,
      historyApiFallback: true,
      static: { directory: path.join(__dirname, "public") },
      hot: true,
    },
    plugins: [
      new ModuleFederationPlugin({
        name: "host",
        filename: "remoteEntry.js",
        remotes: {
          inventario: "inventario@https://microfrontends-ds3-ashen.vercel.app/remoteEntry.js",
          orden:     "orden@https://microfrontends-ds3-orden.vercel.app/remoteEntry.js",
          ventas:    "ventas@https://microfrontends-ds3-ventas.vercel.app/remoteEntry.js",
        },
        exposes: {},
        shared: {
          react: {
            singleton: true,
            eager: true,
            requiredVersion: false,
          },
          "react-dom": {
            singleton: true,
            eager: true,
            requiredVersion: false,
          },
        },
      }),
      new HtmlWebpackPlugin({
        template: path.resolve(__dirname, "index.html"),
      }),
    ],
    optimization: {
      runtimeChunk: "single",
      splitChunks: {
        chunks: "all",
      },
    },
  };
};
