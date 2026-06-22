"use client";

import ReactMarkdown from "react-markdown";

// Renders a prose panel's markdown string with a compact, consistent type scale (no typography
// plugin — element styles are mapped here, mirroring mdx-components.tsx).
export function ProsePanel({ content }: { content: string }) {
  return (
    <div className="text-sm leading-6 text-neutral-700">
      <ReactMarkdown
        components={{
          p: ({ children }) => <p className="mt-3 first:mt-0">{children}</p>,
          h2: ({ children }) => (
            <h2 className="mt-5 text-base font-semibold text-neutral-900">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="mt-4 text-sm font-semibold text-neutral-900">{children}</h3>
          ),
          ul: ({ children }) => <ul className="mt-3 list-disc space-y-1 pl-5">{children}</ul>,
          ol: ({ children }) => <ol className="mt-3 list-decimal space-y-1 pl-5">{children}</ol>,
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-indigo-600 hover:underline"
            >
              {children}
            </a>
          ),
          strong: ({ children }) => <strong className="font-semibold text-neutral-900">{children}</strong>,
          code: ({ children }) => (
            <code className="rounded bg-neutral-100 px-1 py-0.5 font-mono text-[13px]">{children}</code>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
