import { render } from 'preact-render-to-string';
import { Article } from './Article';

const content = `
webpack というと js ファイルをひとまとめにする（バンドル）するものという認識はあったのですが、css ファイルやsass, scss, stylus を始めとする css
プリプロセッサファイルなどもバンドルできるのをご存知だったでしょうか。

簡単にcssファイルもバンドルできてしまうので、紹介します。

### ターゲットユーザー

1. webpack を1度でも使ったことがある人
2. webpack で css をバンドルしたいが敷居が高いと思っている人
3. webpack で css と js をバンドル = CSS in JS と勘違いしている人
4. webpack で css をバンドル = 1つの CSS ファイルが出力されると勘違いしている人

自分はまさに3と4番の勘違いをしてました……

なお、理屈を含めた詳しい内容が知りたいのであれば、以下サイトの記事にて丁寧にまとめられています。

[最新版で学ぶwebpack 4入門 - スタイルシート(CSS/Sass)を取り込む方法 - ICS MEDIA](https://ics.media/entry/17376/)

また、webpack の基本的な使い方はネットでたくさん紹介されているので省略する。

### css をバンドルするために webpack のセットアップ

\`\`\`shell
$ npm init -y #package.jsonファイルがプロジェクトのディレクトリになければ
$ npm i -D webpack webpack-cli style-loader css-loader
\`\`\`

### css ファイル及び css ファイルを読み込む js ファイルを作成

cssファイルは \`src/css/\` ディレクトリを作成して \`main.css\` ファイルを作成し、適当なスタイルを記述しておきましょう。

js ファイルは \`src/\` ディレクトリを作成して \`index.js\` ファイルを作成し、以下を追記。

\`\`\`js:title=index.js
import "./css/main.css";
\`\`\`

以下のようなフォルダ階層になっていればOK

\`\`\`
node_modules/ #npm install 実行時に追加される
src/
|   css/
|   |   main.css
|   index.js
package.json #npm init -y 実行時に追加される
package.lock #npm install 実行時に追加される
\`\`\`

### webpack バンドル方法

今回は2つのバンドル方法を紹介します。

#### npx コマンドでバンドル

npx コマンドが使えるのであれば、以下コマンドでバンドルができます。

なお、npx コマンドは基本的に npm のバージョンが5.2以降であれば標準搭載されているのですが、nodist で node.js のバージョン管理をしている場合はnpxコマンドが使えないようなので、npx
のインストールが必要になります。

[nodistのnpmにはnpxがバンドルされないので、別途入れてみた。 - Qiita](https://qiita.com/horihiro/items/93c3fb247d39911ccdf0)

\`\`\`shell
$ npx webpack src/index.js -p --module-bind "css=style-loader!css-loader" -o dist/bundle.js
\`\`\`

これで記述した css をまとめた \`bundle.js\` が出力されます。

#### webpack.config.js を作成してバンドル

\`webpack.config.js\` を新規作成して、中身を以下のように記述します。

\`\`\`js:title=webpack.config.js
module.exports = {
  mode: "production",
  // webpackで読み込むファイルを指定
  entry: "./src/index.js",
  // 出力先を指定
  output: {
    path: \`\${__dirname}/dist\`,
    filename: "bundle.js"
  },
  module: {
    rules: [{
      // cssファイルのバンドル方法を定義
      test: /\.css/,
      use: [
        "style-loader",
        "css-loader",
      ]
    }]
  }
};
\`\`\`

ファイル階層は以下のようになるはずです。

\`\`\`
node_modules/ #npm install 実行時に追加される
src/
|   css/
|   |   main.css
|   index.js
package.json #npm init -y 実行時に追加される
package.lock #npm install 実行時に追加される
webpack.config.js #webpack設定用のファイル
\`\`\`

\`package.json\` のscriptsに以下の内容を追記してください

\`\`\`diff-json
"scripts": {
-  "test": "echo \"Error: no test specified\" && exit 1"
+  "webpack": "webpack"
},
\`\`\`

あとは以下のコマンドを実行すれば \`dist/bundle.js\` に出力されます。

\`\`\`shell
$ npm run webpack
\`\`\`
`;

console.log(render(<Article title={'テスト'} content={content} />));
document.querySelector('#frame iframe')
  ?.setAttribute('srcdoc', render(<Article title={'テスト'} content={content} />))
