var webpack = require("webpack"),
  path = require("path"),
  CleanWebpackPlugin = require("clean-webpack-plugin").CleanWebpackPlugin,
  CopyWebpackPlugin = require("copy-webpack-plugin"),
  HtmlWebpackPlugin = require("html-webpack-plugin"),
  WriteFilePlugin = require("write-file-webpack-plugin"),
  ReloadPlugin = require("./ReloadPlugin"),
  Dotenv = require("dotenv-webpack"),
  BundleAnalyzerPlugin = require("webpack-bundle-analyzer")
    .BundleAnalyzerPlugin;

var alias = {
  "sodium-native": path.resolve(__dirname, "src/js/crypto/sodium_shim_cjs.js"),
  crypto: path.resolve(__dirname, "src/js/crypto/crypto_shim.js"),
};

var fileExtensions = [
  "jpg",
  "jpeg",
  "png",
  "gif",
  "eot",
  "otf",
  "ttf",
  "woff",
  "woff2",
];

var options = {
  context: path.resolve(__dirname, "src"),
  mode: process.env.NODE_ENV || "development",
  entry: {
    background: "./js/background/background.ts",
    content: [
      process.env.NODE_ENV === "development" && "react-devtools",
      "./js/content/content.tsx",
    ].filter(Boolean),
    interceptor: "./js/content/mapsInterceptor.ts",
  },
  output: {
    path: path.resolve(__dirname, "build"),
    filename: "[name].bundle.js",
  },
  node: { stream: true, crypto: "empty", Buffer: false, buffer: false },
  module: {
    rules: [
      {
        test: /\.css$/,
        loader: "style-loader!css-loader",
        exclude: /node_modules/,
      },
      {
        test: new RegExp(".(" + fileExtensions.join("|") + ")$"),
        loader: "file-loader?name=[name].[ext]",
        exclude: /node_modules/,
      },
      {
        test: /\.html$/,
        loader: "html-loader",
        exclude: /node_modules/,
      },
      {
        test: /\.(j|t)sx?$/,
        loader: "babel-loader",
        exclude: /node_modules/,
      },
      {
        test: /\.svg$/,
        loader: "@svgr/webpack",
      },
      {
        test: /remote-redux-devtools/,
        sideEffects: false,
      },
    ],
  },
  resolve: {
    alias: alias,
    extensions: fileExtensions
      .map((extension) => "." + extension)
      .concat([".jsx", ".js", ".tsx", ".ts", ".css", ".svg"]),
  },
  resolveLoader: {
    alias: {
      "schema-loader": path.resolve(__dirname, "utils/schema-loader.ts"),
    },
  },
  plugins: [
    process.env.NODE_ENV === "development" &&
      new ReloadPlugin({
        contentScripts: ["content"],
        backgroundScript: "background",
      }),
    // clean the build folder
    new CleanWebpackPlugin(),
    // expose and write the allowed env vars on the compiled bundle
    new webpack.EnvironmentPlugin({ NODE_ENV: "development" }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: "./manifest.json",
          transform: function (content, path) {
            // generates the manifest file using the package.json informations
            return Buffer.from(
              JSON.stringify({
                description: process.env.npm_package_description,
                version: process.env.npm_package_version,
                ...JSON.parse(content.toString()),
              })
            );
          },
        },
      ],
    }),
    new CopyWebpackPlugin({ patterns: [{ from: "./img/icon-128.png" }] }),
    new WriteFilePlugin(),
    new webpack.ProvidePlugin({
      Buffer: ["buffer", "Buffer"],
    }),
    new Dotenv(),
    process.env.NODE_ENV === "production" &&
      new BundleAnalyzerPlugin({ generateStatsFile: true }),
  ].filter(Boolean),
};

if (process.env.NODE_ENV === "development") {
  options.devtool = "inline-cheap-module-source-map";
}

module.exports = options;
