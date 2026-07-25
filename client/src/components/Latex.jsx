import { useMemo } from 'react';
import katex from 'katex';

export default function Latex({ tex, className = '' }) {
  const html = useMemo(
    () =>
      katex.renderToString(tex, {
        throwOnError: false,
        displayMode: false,
        strict: false,
      }),
    [tex]
  );
  return <span className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}
