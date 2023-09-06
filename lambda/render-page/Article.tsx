import { Html } from "./Html"
import { parse } from 'marked';
import createDOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

export const Article = (props: any) => {

  const window = new JSDOM('').window;
  const DOMPurify = createDOMPurify(window);
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