import { useState, useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import { parseBBCodeToHtml } from '@/lib/text'

const MarkdownComponents = {
  code({ node, className, children, ...props }: any) {
    const value = String(children || '').replace(/\n$/, '')
    const hasRuby = value.includes('<ruby>') || value.includes('</ruby>')
    if (hasRuby) {
      return (
        <code className={className} dangerouslySetInnerHTML={{ __html: value }} {...props} />
      )
    }
    return <code className={className} {...props}>{children}</code>
  }
}

export const TypewriterText = ({ text }: { text: string }) => {
  const [displayedText, setDisplayedText] = useState('')
  const [isTyping, setIsTyping] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setDisplayedText('')
    setIsTyping(true)
    let i = 0
    const startTime = Date.now()

    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime

      // If 2 seconds have passed, just dump the remaining text instantly
      if (elapsed > 2000) {
        setDisplayedText(text)
        setIsTyping(false)
        clearInterval(timer)
      } else {
        if (i < text.length) {
          i += 3 // Realistic LLM typing speed
          setDisplayedText(text.substring(0, i))
        } else {
          setIsTyping(false)
          clearInterval(timer)
        }
      }
    }, 15)
    return () => clearInterval(timer)
  }, [text])

  useEffect(() => {
    if (isTyping && bottomRef.current) {
      bottomRef.current.scrollIntoView({ block: 'nearest' })
    }
  }, [displayedText, isTyping])

  const formatLatex = (t: string) => {
    return t
      .replace(/`\s*(<ruby>[\s\S]*?<\/ruby>)\s*`/g, '$1') // Strip backticks around ruby tags
      .replace(/\$\\rightarrow\$/g, '→')
      .replace(/\$\\Rightarrow\$/g, '⇒')
      .replace(/\$\\left/g, '←')
      .replace(/\$\\Left/g, '⇐')
      .replace(/\$\\leftrightarrow\$/g, '↔')
      .replace(/\$\\Leftrightarrow\$/g, '⇔')
      .replace(/\$\\times\$/g, '×')
      .replace(/\$\\div\$/g, '÷')
      .replace(/\$\\le\$/g, '≤')
      .replace(/\$\\ge\$/g, '≥')
      .replace(/\$\\neq\$/g, '≠')
      .replace(/\$\\approx\$/g, '≈')
      .replace(/\$\\pm\$/g, '±')
  }

  return (
    <>
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={MarkdownComponents}>
        {parseBBCodeToHtml(formatLatex(displayedText))}
      </ReactMarkdown>
      {isTyping && <span className="inline-block w-1.5 h-3.5 ml-1 bg-indigo-500 animate-pulse align-middle" />}
      <div ref={bottomRef} />
    </>
  )
}
