import { Html } from "./Html"
import { parse } from 'marked';
import createDOMPurify from 'dompurify';

const sanitizeWindow = (() => {
  if (typeof window !== 'undefined') {
    return window;
  } else if (require && require('jsdom')) {
    const { JSDOM } = require('jsdom');
    return new JSDOM('').window;
  } else {
    throw 'NO WINDOW RESOURCE';
  }
})();

export const Article = (props: any) => {

  const DOMPurify = createDOMPurify(sanitizeWindow);
  const content = DOMPurify.sanitize(parse(props.content));

  const head = <>
    <title>{props.title}</title>
  </>

  return <Html head={head}>
    <main>
      <article>
        <h1>{props.title}</h1>
        <div dangerouslySetInnerHTML={{ __html: content }}></div>
      </article>
    </main>
  </Html>
}