import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import "katex/dist/katex.min.css";
import { cn } from "@/lib/cn";

/**
 * Markdown con tablas y fórmulas LaTeX ($…$ y $$…$$), para guías, ejercicios y resúmenes.
 * Es un Server Component: se pinta en el servidor y se puede pasar ya hecho a un Client Component.
 */
export function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div className={cn("md", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
