import type { MDXComponents } from "mdx/types";
import Link from "next/link";

// Required by @next/mdx in the App Router. Maps MDX elements to styled components
// so legal/marketing prose renders consistently without a typography plugin.
export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    h1: ({ children }) => (
      <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">{children}</h1>
    ),
    h2: ({ children }) => (
      <h2 className="mt-10 text-lg font-semibold tracking-tight text-neutral-900">{children}</h2>
    ),
    h3: ({ children }) => (
      <h3 className="mt-6 text-base font-semibold text-neutral-900">{children}</h3>
    ),
    p: ({ children }) => (
      <p className="mt-4 text-sm leading-6 text-neutral-700">{children}</p>
    ),
    ul: ({ children }) => (
      <ul className="mt-4 list-disc space-y-1 pl-5 text-sm leading-6 text-neutral-700">
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol className="mt-4 list-decimal space-y-1 pl-5 text-sm leading-6 text-neutral-700">
        {children}
      </ol>
    ),
    li: ({ children }) => <li className="pl-1">{children}</li>,
    a: ({ href, children }) => {
      const target = href ?? "#";
      const isInternal = target.startsWith("/");
      const cls = "font-medium text-indigo-600 underline-offset-2 hover:underline";
      return isInternal ? (
        <Link href={target} className={cls}>
          {children}
        </Link>
      ) : (
        <a href={target} className={cls} target="_blank" rel="noopener noreferrer">
          {children}
        </a>
      );
    },
    strong: ({ children }) => (
      <strong className="font-semibold text-neutral-900">{children}</strong>
    ),
    hr: () => <hr className="mt-10 border-neutral-200" />,
    ...components,
  };
}
