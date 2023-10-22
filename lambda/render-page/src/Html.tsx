import { ComponentChildren, JSX } from "preact";

type Props = {
  head?: JSX.Element
  children?: ComponentChildren
}

export const Html = (props: Props) => <html lang="ja">
  <head>
    <meta charSet="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="stylesheet" href="/assets/css/style.css" />
    {props.head}
  </head>
  <body>
    <Header />
    {props.children}
    <Footer />
  </body>
</html>

export const Header = (_props: any) => <header className={'header'}>
  <a href='/' class={'header-site-logo'}>Pulog</a>
  <div class={'header-site-description'}>プログラムのブログ 略してプログ</div>
</header>

export const Footer = (_props: any) => <footer className={'footer'}>
  <small>&copy; 2020 Pulog</small>
</footer>