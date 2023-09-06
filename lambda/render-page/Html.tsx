import { ComponentChildren, JSX } from "preact";

type Props = {
  head?: JSX.Element
  children?: ComponentChildren
}

export const Html = (props: Props) => <html lang="ja">
  <head>
    <meta charSet="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    {props.head}
  </head>
  <body>
    {props.children}
  </body>
</html>