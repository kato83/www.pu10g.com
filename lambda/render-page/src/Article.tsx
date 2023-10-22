import { Html } from "./Html"
import { marked, Tokens } from 'marked';
import createDOMPurify from 'dompurify';
import { isBrowser } from "./util";
import { gfmHeadingId } from "marked-gfm-heading-id";
import { createPortal } from "preact/compat";

const sanitizeWindow = (() => {
  if (isBrowser()) {
    return window;
  } else {
    const { JSDOM } = require('jsdom');
    return new JSDOM('').window;
  }
})();

export const Article = (props: any) => {

  marked.use(gfmHeadingId());

  const tokens = marked.lexer(props.content);
  const headings = tokens.filter((token): token is Tokens.Heading => token.type === 'heading');

  const DOMPurify = createDOMPurify(sanitizeWindow);
  const content = DOMPurify.sanitize(marked.parse(props.content));

  const head = <>
    <title>{props.title}</title>
  </>

  return <Html head={head}>
    <main>
      <article className={'article-detail'}>
        <h1>{props.title}</h1>
        {createPortal(
          <meta name={'hoge'} content={'foo'} />,
          document.head
        )}
        <details open={true} className={'toc'}>
          <summary>目次</summary>
          <nav aria-label="Chapters">
            <ol>
              {headings.map((item) => {
                const href = item.text
                  .replace(/\s+/g, "-")
                  .replace(/[!$%^&@#*()+|~=`{}[\]:";'<>?,./]/g, "")
                  .toLowerCase();
                return <li key={item.text} style={{ paddingLeft: item.depth }}>
                  <a href={`#${href}`}>{item.text}</a>
                </li>
              })}
            </ol>
          </nav>
        </details>
        <div dangerouslySetInnerHTML={{ __html: content }}></div>
      </article>
    </main>
  </Html>
}