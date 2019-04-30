const path = require('path');

module.exports = {
    target: 'web',
    mode: "development",
    devtool: "inline-source-map",
    entry: "./main.tsx",
    output: {
      filename: "bundle.js",

        // 出力先のパス（絶対パスを指定する必要がある）
        path: path.join(__dirname, '../public/js')      

    },
    resolve: {
      // Add `.ts` and `.tsx` as a resolvable extension.
      extensions: [".ts", ".tsx", ".js"]
    },
    module: {
      rules: [
        // all files with a `.ts` or `.tsx` extension will be handled by `ts-loader`
        { test: /\.tsx?$/, loader: "ts-loader" }
      ]
    }
  };