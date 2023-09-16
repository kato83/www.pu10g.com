import { render } from 'preact-render-to-string';
import { Article } from './Article';

document.querySelector('#frame iframe')
  ?.setAttribute('srcdoc', render(<Article title={'テスト'} content={'これはAAAAAAAA<script>alert("ｫｫｫｫｫx")</script>です'} />))
