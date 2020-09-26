import React, { useEffect, useState } from "react";

const HtmlDecorator: React.FunctionComponent<{ html: string }> = (props) => {
  const { html } = props;

  const [htmlReplaced, setHtmlReplaced] = useState(false);

  useEffect(() => {
    const newDoc = new DOMParser().parseFromString(html, "text/html");
    const stylesheets = Array.from(newDoc.getElementsByTagName("style"))
      .concat(
        Array.from(newDoc.getElementsByTagName("link")).filter((e) =>
          /stylesheet/i.test(e.getAttribute("rel") ?? "")
        )
      )
      .map((e) => document.importNode(e, true));

    const bodyNodes = Array.from(
      document.importNode(newDoc.body, true).childNodes
    );
    stylesheets.forEach((s) => document.head.appendChild(s));
    bodyNodes.forEach((n) => document.body.appendChild(n));
    setHtmlReplaced(true);
    return () => {
      setHtmlReplaced(false);
      stylesheets.forEach((s) => s.remove());
      bodyNodes.forEach((n) => n.remove());
    };
  }, [html]);

  return htmlReplaced ? <>{props.children}</> : null;
};

export default HtmlDecorator;
