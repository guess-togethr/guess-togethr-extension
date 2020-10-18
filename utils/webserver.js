require("ts-node/register");
var WebpackDevServer = require("webpack-dev-server"),
  webpack = require("webpack"),
  config = require("../webpack.config")({ dev: true }),
  env = require("./env"),
  path = require("path"),
  CopyWebpackPlugin = require("copy-webpack-plugin");

// Webpack uses this path to fetch the manifest + hot update chunks.
// Not setting it for content scripts or scripts injected into client
// pages causes webpack to fetch from a relative path.

const host = "127.0.0.1";
config.output.publicPath = `http://${host}:${env.PORT}/`;

// Replace the manifest transformer so the new content security policy allows
// the public path.

var copyPluginIndex = config.plugins.findIndex(
  (p) => p instanceof CopyWebpackPlugin
);
if (copyPluginIndex !== -1) {
  config.plugins[copyPluginIndex] = new CopyWebpackPlugin({
    patterns: [
      {
        from: "./manifest.json",
        transform: function (content) {
          var manifest = JSON.parse(content.toString());
          var content_security_policy = manifest.content_security_policy;
          //   ? manifest.content_security_policy + "; "
          //   : "") +
          // `script-src 'self' ${config.output.publicPath}; object-src 'self'`;

          // generates the manifest file using the package.json informations
          return Buffer.from(
            JSON.stringify(
              {
                description: process.env.npm_package_description,
                version: process.env.npm_package_version,
                ...manifest,
                content_security_policy,
              },
              null,
              2
            )
          );
        },
      },
    ],
  });
}

var compiler = webpack(config);

var server = new WebpackDevServer(compiler, {
  hot: true,
  contentBase: path.join(__dirname, "../build"),
  sockPort: env.PORT,
  headers: {
    "Access-Control-Allow-Origin": "*",
  },
  disableHostCheck: true,
  host,
  transportMode: "ws",
  writeToDisk: true,
});

server.listen(env.PORT);
