import type { MDXComponents } from "mdx/types";
import Link from "next/link";
import { focusRing } from "@/lib/utils";

// Required by @next/mdx in the App Router. Maps MDX elements to token-styled components so
// legal/marketing prose renders consistently in light AND dark without a typography plugin.
export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    h1: ({ children }) => (
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">{children}</h1>
    ),
    h2: ({ children }) => (
      <h2 className="mt-10 text-lg font-semibold tracking-tight text-foreground">{children}</h2>
    ),
    h3: ({ children }) => <h3 className="mt-6 text-base font-semibold text-foreground">{children}</h3>,
    p: ({ children }) => <p className="mt-4 text-sm leading-6 text-foreground/80">{children}</p>,
    ul: ({ children }) => (
      <ul className="mt-4 list-disc space-y-1 pl-5 text-sm leading-6 text-foreground/80">{children}</ul>
    ),
    ol: ({ children }) => (
      <ol className="mt-4 list-decimal space-y-1 pl-5 text-sm leading-6 text-foreground/80">{children}</ol>
    ),
    li: ({ children }) => <li className="pl-1">{children}</li>,
    a: ({ href, children }) => {
      const target = href ?? "#";
      const isInternal = target.startsWith("/");
      const cls = `rounded-sm font-medium text-brand underline-offset-2 hover:underline ${focusRing}`;
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
    strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
    blockquote: ({ children }) => (
      <blockquote className="mt-4 border-l-2 border-border pl-4 text-sm italic leading-6 text-muted-foreground">
        {children}
      </blockquote>
    ),
    code: ({ children }) => (
      <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em] text-foreground">{children}</code>
    ),
    pre: ({ children }) => (
      <pre className="mt-4 overflow-x-auto rounded-md border border-border bg-muted p-4 font-mono text-xs leading-relaxed text-foreground [&>code]:bg-transparent [&>code]:p-0">
        {children}
      </pre>
    ),
    hr: () => <hr className="mt-10 border-border" />,
    ...components,
  };
}
