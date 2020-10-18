var webpack = require("webpack"),
  path = require("path"),
  PnpWebpackPlugin = require("pnp-webpack-plugin"),
  CleanWebpackPlugin = require("clean-webpack-plugin").CleanWebpackPlugin,
  CopyWebpackPlugin = require("copy-webpack-plugin"),
  WriteFilePlugin = require("write-file-webpack-plugin"),
  ReloadPlugin = require("./ReloadPlugin"),
  ForkTsCheckerWebpackPlugin = require("fork-ts-checker-webpack-plugin"),
  Dotenv = require("dotenv-webpack"),
  TerserPlugin = require("terser-webpack-plugin"),
  BundleAnalyzerPlugin = require("webpack-bundle-analyzer")
    .BundleAnalyzerPlugin;

var alias = {
  "sodium-native": path.resolve(__dirname, "src/crypto/sodium_shim_cjs.js"),
  crypto: path.resolve(__dirname, "src/crypto/crypto_shim.js"),
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

module.exports = ({ prod, dev }) => ({
  context: path.resolve(__dirname, "src"),
  mode: prod ? "production" : "development",
  entry: {
    background: "./background/background.ts",
    content: [dev && "react-devtools", "./content/content.tsx"].filter(Boolean),
    interceptor: "./content/mapsInterceptor.ts",
  },
  output: {
    path: path.resolve(__dirname, "build"),
    filename: "[name].bundle.js",
  },
  node: { stream: true, crypto: "empty", Buffer: false, buffer: false },
  module: {
    rules: [
      {
        test: /remote-redux-devtools/,
        sideEffects: false,
      },
      {
        test: /prop-types/,
        sideEffects: false,
      },
      {
        oneOf: [
          {
            test: /result_files/,
            loader: "file-loader",
          },
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
            options: {
              esModule: true,
              attributes: {
                list: [
                  {
                    tag: "link",
                    attribute: "href",
                    type: "src",
                    filter: (tag, attribute, attributes) =>
                      /stylesheet/i.test(attributes.rel),
                  },
                  { tag: "img", attribute: "src", type: "src" },
                ],
              },
            },
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
        ],
      },
    ],
  },
  resolve: {
    plugins: [PnpWebpackPlugin],
    alias: alias,
    extensions: fileExtensions
      .map((extension) => "." + extension)
      .concat([".jsx", ".js", ".tsx", ".ts", ".css", ".svg"]),
  },
  resolveLoader: {
    plugins: [PnpWebpackPlugin.moduleLoader(module)],
    alias: {
      "schema-loader": path.resolve(__dirname, "utils/schema-loader.ts"),
    },
  },
  plugins: [
    dev &&
      new ReloadPlugin({
        contentScripts: ["content"],
        backgroundScript: "background",
      }),
    // clean the build folder
    dev && new CleanWebpackPlugin(),
    // expose and write the allowed env vars on the compiled bundle
    // new webpack.EnvironmentPlugin({ NODE_ENV: "development" }),
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
    dev && new WriteFilePlugin(),
    new webpack.ProvidePlugin({
      Buffer: ["buffer", "Buffer"],
    }),
    new Dotenv(),
    prod &&
      new BundleAnalyzerPlugin({
        analyzerMode: "static",
        generateStatsFile: true,
      }),
    new ForkTsCheckerWebpackPlugin({
      typescript: {
        configFile: path.resolve(__dirname, "./tsconfig.json"),
        diagnosticOptions: { semantic: true, syntactic: true },
      },
    }),
  ].filter(Boolean),

  devtool: dev ? "inline-cheap-module-source-map" : undefined,
  bail: !!prod,
  performance: { hints: false },
  optimization: {
    minimizer: [new TerserPlugin()],
  },
});
