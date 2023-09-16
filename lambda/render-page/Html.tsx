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
    <Header />
    {props.children}
    <Footer />
  </body>
</html>

export const Header = (_props: any) => <header>
  <a href='/' class={'site-logo'}>Pulog</a>
  <div class={'site-description'}>プログラムのブログ 略してプログ</div>
</header>

export const Footer = (_props: any) => <footer>
  <small>&copy; 2020 PULOG AAAAA</small>
</footer>