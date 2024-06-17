const path = require("path");
const TerserPlugin = require("terser-webpack-plugin");

module.exports = (env, argv) => {
  const mode = argv.mode === "production" ? "production" : "development";

  return {
    mode: mode,
    devtool: mode === "production" ? false : "inline-source-map",
    entry: {
      code: "./src/code.ts", // Entry point for the plugin code
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: "ts-loader",
          exclude: /node_modules/,
        },
      ],
    },
    resolve: {
      extensions: [".ts", ".js"],
    },
    output: {
      filename: "[name].js",
      path: path.resolve(__dirname, "dist"),
    },
    optimization: {
      minimize: true,
      minimizer: [
        new TerserPlugin({
          terserOptions: {
            // Terser minification options
            format: {
              comments: false, // Remove all comments
            },
            compress: {
              drop_console: true, // Remove console logs
              drop_debugger: true, // Remove debugger statements
            },
            mangle: true, // Mangle the code
            keep_classnames: false, // Do not keep class names
            keep_fnames: false, // Do not keep function names
          },
          extractComments: false, // Do not extract comments to a separate file
        }),
      ],
    },
  };
};
