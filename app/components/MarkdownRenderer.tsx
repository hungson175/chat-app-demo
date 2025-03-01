import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Components } from 'react-markdown'

// Define proper types for component props
type MarkdownProps = {
  content: string
}

// Define types for code block props
type CodeProps = {
  node?: any
  inline?: boolean
  className?: string
  children?: React.ReactNode
} & React.HTMLAttributes<HTMLElement>

// Define the markdown components with proper typing
const markdownComponents: Components = {
  // Root container
  div: ({node, ...props}) => (
    <div className="markdown-content text-base leading-normal" {...props} />
  ),
  
  // Block elements
  p: ({node, ...props}) => (
    <p className="mb-4 text-gray-800" {...props} />
  ),
  blockquote: ({node, ...props}) => (
    <blockquote 
      className="pl-4 italic border-l-4 border-gray-300 text-gray-600 mb-4" 
      {...props} 
    />
  ),
  
  // Headings
  h1: ({node, ...props}) => (
    <h1 
      className="text-3xl font-bold mb-4 mt-6 pb-2 border-b border-gray-200 text-gray-900" 
      {...props} 
    />
  ),
  h2: ({node, ...props}) => (
    <h2 
      className="text-2xl font-bold mb-3 mt-5 text-gray-900" 
      {...props} 
    />
  ),
  h3: ({node, ...props}) => (
    <h3 
      className="text-xl font-bold mb-2 mt-4 text-gray-900" 
      {...props} 
    />
  ),
  h4: ({node, ...props}) => (
    <h4 
      className="text-lg font-semibold mb-2 mt-4 text-gray-900" 
      {...props} 
    />
  ),
  h5: ({node, ...props}) => (
    <h5 
      className="text-base font-semibold mb-2 mt-4 text-gray-900" 
      {...props} 
    />
  ),
  h6: ({node, ...props}) => (
    <h6 
      className="text-sm font-semibold mb-2 mt-4 text-gray-900" 
      {...props} 
    />
  ),
  
  // Lists
  ul: ({node, ...props}) => (
    <ul 
      className="list-disc list-inside mb-4 pl-4 space-y-1 text-gray-800" 
      {...props} 
    />
  ),
  ol: ({node, ...props}) => (
    <ol 
      className="list-decimal list-inside mb-4 pl-4 space-y-1 text-gray-800" 
      {...props} 
    />
  ),
  li: ({node, ...props}) => (
    <li className="mb-1" {...props} />
  ),
  
  // Links and Images
  a: ({node, href, children, ...props}) => {
    // Handle cases where href is missing
    let url = href || ''
    
    // If text is in [domain.com] format without explicit URL
    if (!href && children && typeof children === 'string' && /^\[[\w.-]+\]$/.test(children)) {
      const domain = children.slice(1, -1) // Remove [ ]
      url = `https://${domain}`
    }
    
    // If no protocol specified, add https://
    if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`
    }

    return (
      <a 
        href={url}
        className="inline-flex items-center gap-0.5 text-blue-600 hover:text-blue-800 font-medium 
                   decoration-blue-600/30 hover:decoration-blue-800/50 underline underline-offset-2
                   transition-colors rounded px-1 hover:bg-blue-50/50"
        target="_blank"
        rel="noopener noreferrer"
        {...props}
      >
        {children}
      </a>
    )
  },
  img: ({node, src, alt, ...props}) => (
    <img 
      src={src} 
      alt={alt} 
      className="max-w-full h-auto rounded-lg my-4"
      loading="lazy"
      {...props} 
    />
  ),
  
  // Inline text styling
  strong: ({node, ...props}) => (
    <strong className="font-bold text-gray-900" {...props} />
  ),
  em: ({node, ...props}) => (
    <em className="italic text-gray-800" {...props} />
  ),
  del: ({node, ...props}) => (
    <del className="line-through text-gray-600" {...props} />
  ),
  
  // Code blocks
  code: ({node, inline, className, children, ...props}: CodeProps) => {
    const match = /language-(\w+)/.exec(className || '')
    return !inline ? (
      <div className="relative">
        <pre className="rounded-lg bg-gray-900 p-4 mb-4 overflow-x-auto">
          <code
            className={`text-sm text-gray-200 ${className || ''}`}
            {...props}
          >
            {children}
          </code>
        </pre>
      </div>
    ) : (
      <code
        className="px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-900 text-sm font-mono"
        {...props}
      >
        {children}
      </code>
    )
  },
  pre: ({node, ...props}) => (
    <pre className="mt-0" {...props} />
  ),
  
  // Tables
  table: ({node, ...props}) => (
    <div className="overflow-x-auto my-6 rounded-lg border border-gray-200">
      <table 
        className="min-w-full divide-y divide-gray-200"
        {...props} 
      />
    </div>
  ),
  thead: ({node, ...props}) => (
    <thead className="bg-gray-50" {...props} />
  ),
  tbody: ({node, ...props}) => (
    <tbody className="divide-y divide-gray-200 bg-white" {...props} />
  ),
  tr: ({node, ...props}) => (
    <tr 
      className="transition-colors hover:bg-gray-50/50" 
      {...props} 
    />
  ),
  th: ({node, ...props}) => (
    <th 
      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
      {...props} 
    />
  ),
  td: ({node, ...props}) => (
    <td 
      className="px-4 py-3 text-sm text-gray-500 whitespace-normal"
      {...props} 
    />
  ),
  
  // Horizontal Rule
  hr: ({node, ...props}) => (
    <hr 
      className="my-8 h-px border-0 bg-gray-200" 
      {...props}
    />
  ),
}

export function MarkdownRenderer({ content }: MarkdownProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={markdownComponents}
    >
      {content}
    </ReactMarkdown>
  )
} 