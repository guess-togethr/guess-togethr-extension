const { CleanWebpackPlugin } = require("clean-webpack-plugin");
module.exports = (config) => ({
  ...config,
  plugins: config.plugins.filter((p) => !p instanceof CleanWebpackPlugin).concat(),
});
