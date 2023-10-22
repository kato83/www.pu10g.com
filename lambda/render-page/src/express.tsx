import express from 'express';
import { render } from 'preact-render-to-string';
import { Article } from './Article';
import { content } from './content';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('./public'));


// 設定サンプルとしてCORS
app.use((_: express.Request, res: express.Response, next: express.NextFunction) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "*")
  res.header("Access-Control-Allow-Headers", "*");
  next();
});

app.listen(3000, () => console.log("Start on port 3000."));

//一覧取得
app.get('/', (_, res) => res.send(render(<Article title={'テスト'} content={content} />)));