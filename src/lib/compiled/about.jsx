import {Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs} from "react/jsx-runtime";
function _createMdxContent(props) {
  const _components = {
    a: "a",
    h2: "h2",
    p: "p",
    ...props.components
  };
  return _jsxs(_Fragment, {
    children: [_jsx(_components.h2, {
      children: "关于作者"
    }), "\n", _jsx("img", {
      src: "/static/favicons/avatar.png",
      alt: "Avatar",
      width: "100",
      height: "100",
      className: "rounded-full max-w-md mx-auto shadow drop-shadow mt-8 hover:shadow-lg hover:ring-2 hover:ring-zinc-400 dark:ring-zinc-700 transition transform duration-500"
    }), "\n", _jsx("p", {
      className: "text-center text-xl",
      children: "槐序"
    }), "\n", _jsx("center", {
      children: "00后/大城市里的老鼠/少数派/梦想成为自由职业者"
    }), "\n", _jsx(_components.h2, {
      children: "订阅全文输出RSS"
    }), "\n", _jsx(_components.p, {
      children: _jsx(_components.a, {
        href: "/rss",
        children: "RSS2 Feed"
      })
    }), "\n", _jsx(_components.p, {
      children: _jsx(_components.a, {
        href: "/atomfeed",
        children: "ATOM Feed"
      })
    }), "\n", _jsx(_components.p, {
      children: _jsx(_components.a, {
        href: "/jsonfeed",
        children: "JSON Feed"
      })
    })]
  });
}
export default function MDXContent(props = {}) {
  const {wrapper: MDXLayout} = props.components || ({});
  return MDXLayout ? _jsx(MDXLayout, {
    ...props,
    children: _jsx(_createMdxContent, {
      ...props
    })
  }) : _createMdxContent(props);
}
