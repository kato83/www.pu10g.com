import { render } from 'preact-render-to-string';
import { Article } from './Article';

const html = render(<Article title={'テスト'} content={'これはテストです'} />);
console.log(html);