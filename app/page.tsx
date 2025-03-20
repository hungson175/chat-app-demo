"use client"

import type React from "react"

import { useState, useRef, useEffect, useCallback } from "react"
import { ChevronDown, Lightbulb, Mic, Plus, Search, Loader2, Send, Copy, ThumbsUp, ThumbsDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import axios from 'axios'
import { MarkdownRenderer } from "@/app/components/MarkdownRenderer"
import { usePlausible } from 'next-plausible'
import { trackMessageSent } from '@/lib/mixpanel'
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"

type Message = {
  id: string
  content: string
  role: "user" | "assistant"
  thinking: string
  isThinkingExpanded: boolean
  isThinking: boolean
  thinkingStartTime?: number
}

// Add this constant at the top level
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/ws/chat'
// const WS_URL = 'wss://fin-demo.xyz/ws/chat'
const BOT_NAME = 'LTI-Bot'
const MAX_RETRIES = 3
const RETRY_DELAY = 1000

const WELCOME_MESSAGE = `Chào mừng bạn đến với Trợ lý Đầu tư AI! Tôi chỉ tư vấn chứng khoán dài hạn.
Bạn có thể hỏi tôi tất tần tật về đầu tư dài hạn các cổ phiếu trong VN100.

*Lưu ý: Tôi không phải cố vấn tài chính được cấp phép; thông tin chỉ mang tính tham khảo. Đầu tư luôn tiềm ẩn rủi ro; bạn nên tự đánh giá trước khi quyết định.*

Hãy đặt câu hỏi để bắt đầu! Một số câu hỏi gợi ý: `

const EXAMPLE_QUESTIONS = [
  "FPT đầu tư dài hạn được không?",
  "Đây có phải thời điểm tốt để xuống tiền ko mài ?",
  "30 triệu nên đầu tư ngành nào?",
  "Những ngành nào có triển vọng trong 5 năm tới?",
  "Nên chọn VCB hay MBB?"
]

const MAX_QUESTIONS = 8

export default function Chat() {
  const plausible = usePlausible()
  const { toast } = useToast()
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      content: WELCOME_MESSAGE,
      role: "assistant",
      thinking: "",
      isThinkingExpanded: false,
      isThinking: false
    }
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [conversationId, setConversationId] = useState<string | undefined>()
  const [questionCount, setQuestionCount] = useState(0)
  const [showLimitDialog, setShowLimitDialog] = useState(false)
  const [isConnecting, setIsConnecting] = useState(true)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<NodeJS.Timeout>()
  const inputRef = useRef<HTMLInputElement>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectAttempts = useRef(0)
  const [wsReady, setWsReady] = useState(false)

  // Initialize WebSocket connection
  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      setIsConnecting(false)
      return
    }

    setIsConnecting(true)
    console.log('Attempting to connect to WebSocket...')
    const ws = new WebSocket(WS_URL)
    wsRef.current = ws

    ws.onopen = () => {
      console.log('WebSocket connected')
      setWsReady(true)
      setIsConnecting(false)
      reconnectAttempts.current = 0
    }

    ws.onclose = () => {
      console.log('WebSocket closed')
      setWsReady(false)
      setIsConnecting(true)
      wsRef.current = null

      // Attempt to reconnect if we haven't exceeded max retries
      if (reconnectAttempts.current < MAX_RETRIES) {
        reconnectAttempts.current += 1
        console.log(`Reconnecting... Attempt ${reconnectAttempts.current}`)
        setTimeout(connectWebSocket, RETRY_DELAY)
      } else {
        setIsConnecting(false)
        toast({
          title: "Connection Failed",
          description: "Could not connect to server after multiple attempts. Please try again later.",
          duration: 5000,
        })
      }
    }

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      
      switch (data.type) {
        case 'thinking':
          // Update the thinking content of the latest user message
          setMessages(prev => {
            // Find the last message that is currently thinking
            const lastMessage = prev[prev.length - 1]
            
            if (!lastMessage || !lastMessage.isThinking) {
              return prev
            }
            
            return prev.map((msg, idx) => {
              if (idx === prev.length - 1) {
                // Only update the most recent message
                const currentThinking = msg.thinking || ""
                const newThinking = data.content.trim()
                return {
                  ...msg,
                  thinking: currentThinking + (currentThinking ? "\n" : "") + newThinking
                }
              }
              return msg
            })
          })
          break
          
        case 'final':
          // Store conversation_id for next messages
          if (data.conversation_id) {
            setConversationId(data.conversation_id)
          }
          
          // Update the last user message to stop thinking
          setMessages(prev => {
            const lastUserMessageIndex = [...prev].reverse().findIndex(m => m.role === 'user' && m.isThinking)
            
            if (lastUserMessageIndex === -1) return prev
            
            const actualIndex = prev.length - 1 - lastUserMessageIndex
            const newMessages = prev.map((msg, idx) => {
              if (idx === actualIndex) {
                return {
                  ...msg,
                  isThinking: false,
                  isThinkingExpanded: false
                }
              }
              return msg
            })
            
            // Add bot response
            return [...newMessages, {
              id: crypto.randomUUID(),
              content: data.content,
              role: "assistant",
              thinking: "",
              isThinkingExpanded: false,
              isThinking: false
            }]
          })
          setIsLoading(false)
          break
          
        case 'error':
          console.error('WebSocket error:', data.content)
          setMessages(prev => [...prev, {
            id: crypto.randomUUID(),
            content: "Sorry, there was an error processing your request. Please try again.",
            role: "assistant",
            thinking: "",
            isThinkingExpanded: false,
            isThinking: false
          }])
          setIsLoading(false)
          break
      }
    }

    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
    }
  }, [])

  // Initialize WebSocket connection when component mounts
  useEffect(() => {
    connectWebSocket()
    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [connectWebSocket])

  // Clear chat session - update to also reset WebSocket
  const clearSession = () => {
    setMessages([{
      id: "welcome",
      content: WELCOME_MESSAGE,
      role: "assistant", 
      thinking: "",
      isThinkingExpanded: false,
      isThinking: false
    }])
    setInput("")
    setIsLoading(false)
    setShouldAutoScroll(true)
    setConversationId(undefined)
    setQuestionCount(0)
    setShowLimitDialog(false)
    
    // Reset WebSocket connection
    if (wsRef.current) {
      wsRef.current.close()
    }
    reconnectAttempts.current = 0
    connectWebSocket()
    
    // Focus input after clearing
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  // Check if question limit is reached
  const isLimitReached = () => questionCount >= MAX_QUESTIONS

  // Toggle thinking expanded state for a message
  const toggleThinking = (messageId: string) => {
    setMessages(
      messages.map((msg) => {
        return msg.id === messageId ? { ...msg, isThinkingExpanded: !msg.isThinkingExpanded } : msg
      }),
    )
  }

  // Add timer effect
  useEffect(() => {
    const thinkingMessage = messages.find(m => m.isThinking)
    
    if (thinkingMessage && thinkingMessage.thinkingStartTime) {
      timerRef.current = setInterval(() => {
        const elapsed = Date.now() - thinkingMessage.thinkingStartTime!
        setElapsedTime(Math.floor(elapsed / 1000))
      }, 1000)
      
      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current)
        }
      }
    } else {
      setElapsedTime(0)
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [messages])

  // Handle scroll events to detect when user scrolls up
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const div = e.currentTarget
    const isScrollingUp = div.scrollTop < div.scrollHeight - div.clientHeight - 10 // Add small threshold
    if (isScrollingUp) {
      setShouldAutoScroll(false)
    }
  }

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    if (shouldAutoScroll && chatEndRef.current) {
      setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
      }, 100) // Small delay to ensure content is rendered
    }
  }, [messages, shouldAutoScroll])

  // Reset auto-scroll when user starts typing a new message
  useEffect(() => {
    if (input) {
      setShouldAutoScroll(true)
    }
  }, [input])

  // Effect to show limit dialog when max questions reached
  useEffect(() => {
    if (isLimitReached()) {
      // Remove auto-showing dialog here
      // setShowLimitDialog(true)
    }
  }, [questionCount])

  // Auto focus input on component mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Track session start for retention analysis
  useEffect(() => {
    plausible('session_start', {
      props: {
        timestamp: new Date().toISOString()
      }
    })
  }, [plausible])

  // Update onSubmit to track user activation
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    
    // Show limit dialog if reached and trying to submit
    if (isLimitReached()) {
      setShowLimitDialog(true)
      return
    }

    if (!wsReady) {
      console.error('WebSocket is not ready')
      toast({
        title: "Connection error",
        description: "Connection to server not ready. Please try again in a moment.",
        duration: 2000,
      })
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        content: "Connection to server not ready. Please try again in a moment.",
        role: "assistant",
        thinking: "",
        isThinkingExpanded: false,
        isThinking: false
      }])
      return
    }

    // Track user activation in Plausible
    plausible('user_activated', {
      props: {
        source: 'manual_input',
        timestamp: new Date().toISOString()
      }
    })

    // Track message sent in Mixpanel
    trackMessageSent({
      source: 'manual_input',
      message_length: input.trim().length,
      conversation_id: conversationId
    });

    setIsLoading(true)
    setElapsedTime(0)
    setQuestionCount(prev => prev + 1)

    const tempId = crypto.randomUUID()
    // Add user message with empty thinking
    const userMessage: Message = {
      id: tempId,
      content: input.trim(),
      role: "user",
      thinking: "",
      isThinkingExpanded: true,
      isThinking: true,
      thinkingStartTime: Date.now()
    }
    setMessages((prev) => [...prev, userMessage])
    setInput("")

    // Keep focus on input
    inputRef.current?.focus()

    // Send message through WebSocket
    wsRef.current?.send(JSON.stringify({
      message: input.trim(),
      conversation_id: conversationId
    }))
  }

  // Update example questions handler to track user activation
  const handleExampleQuestion = (question: string) => {
    if (isLoading) return
    
    // Show limit dialog if reached and trying to use example question
    if (isLimitReached()) {
      setShowLimitDialog(true)
      return
    }

    // Track user activation in Plausible
    plausible('user_activated', {
      props: {
        source: 'example_question',
        timestamp: new Date().toISOString()
      }
    })

    // Track message sent in Mixpanel
    trackMessageSent({
      source: 'example_question',
      message_length: question.length,
      conversation_id: conversationId
    });

    const tempId = crypto.randomUUID()
    const userMessage: Message = {
      id: tempId,
      content: question,
      role: "user",
      thinking: "",
      isThinkingExpanded: true,
      isThinking: true,
      thinkingStartTime: Date.now()
    }
    setMessages(prev => [...prev, userMessage])
    setInput("")
    setIsLoading(true)
    setElapsedTime(0)
    setQuestionCount(prev => prev + 1)
    
    wsRef.current?.send(JSON.stringify({
      message: question,
      conversation_id: conversationId
    }))
  }

  const handleCopyContent = (content: string) => {
    navigator.clipboard.writeText(content)
    toast({
      title: "Copied to clipboard",
      description: "Content has been copied to your clipboard",
      duration: 2000,
    })
  }

  const handleThumbsUp = () => {
    // Stub for thumbs up functionality
    toast({
      title: "Thanks for your feedback!",
      description: "We're glad this was helpful",
      duration: 2000,
    })
  }

  const handleThumbsDown = () => {
    // Stub for thumbs down functionality
    toast({
      title: "Thanks for your feedback!",
      description: "We'll work on improving our responses",
      duration: 2000,
    })
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Connection Overlay */}
      {isConnecting && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-background p-8 rounded-xl shadow-lg flex flex-col items-center gap-4 max-w-md mx-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <h2 className="text-xl font-semibold">Connecting to server...</h2>
            <p className="text-muted-foreground text-center">
              {reconnectAttempts.current > 0 
                ? `Reconnection attempt ${reconnectAttempts.current} of ${MAX_RETRIES}...`
                : 'Establishing secure connection...'}
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b">
        <div className="text-xl font-bold">{BOT_NAME}</div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Button 
                variant="ghost"
                className="border rounded-md px-4 py-2 flex items-center gap-2 hover:bg-gray-100"
                onClick={clearSession}
              >
                <Plus className="h-4 w-4" />
                <span>New Chat</span>
              </Button>
              <div className="absolute -right-2 -top-2 flex items-center justify-center w-6 h-6 bg-blue-500 text-white text-xs font-medium rounded-full">
                {MAX_QUESTIONS - questionCount}
              </div>
            </div>
            <Button variant="ghost" size="icon">
              <div className="h-8 w-8 rounded-full bg-gray-200" />
            </Button>
          </div>
        </div>
      </header>

      {/* Chat Area */}
      <div 
        className="flex-1 overflow-auto p-4" 
        ref={chatContainerRef} 
        onScroll={handleScroll}
      >
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.map((message) => (
            <div key={message.id} className="space-y-2">
              <Card className="rounded-xl shadow-sm">
                <CardContent className="p-6">
                  <div className="prose max-w-none">
                    <span className="font-bold">{message.role === "user" ? "You: " : "Bot: "}</span>
                    {message.role === "user" ? (
                      <span className="whitespace-pre-wrap text-base">{message.content}</span>
                    ) : (
                      <>
                        <div className="flex flex-col">
                          <div className="flex-1">
                            <MarkdownRenderer content={message.content} />
                          </div>
                          {message.id !== "welcome" && (
                            <div className="flex items-center justify-end gap-1 mt-4 border-t pt-3">
                              <Button
                                variant="ghost"
                                className="h-8 px-2 rounded hover:bg-gray-100 active:bg-gray-200 focus:outline-none focus:ring-0 focus-visible:ring-0"
                                onClick={() => {
                                  handleCopyContent(message.content)
                                  toast({
                                    title: "Copied to clipboard",
                                    description: "Content has been copied to your clipboard",
                                    duration: 2000,
                                  })
                                }}
                              >
                                <Copy className="h-4 w-4 mr-1" />
                                <span className="text-sm">Copy</span>
                              </Button>
                              <div className="h-4 w-px bg-gray-200 mx-1" />
                              <Button
                                variant="ghost"
                                className="h-8 px-2 rounded hover:bg-gray-100 active:bg-gray-200 focus:outline-none focus:ring-0 focus-visible:ring-0"
                                onClick={() => {
                                  handleThumbsUp()
                                  toast({
                                    title: "Thanks for your feedback!",
                                    description: "We're glad this was helpful",
                                    duration: 2000,
                                  })
                                }}
                              >
                                <ThumbsUp className="h-4 w-4 mr-1" />
                                <span className="text-sm">Helpful</span>
                              </Button>
                              <Button
                                variant="ghost"
                                className="h-8 px-2 rounded hover:bg-gray-100 active:bg-gray-200 focus:outline-none focus:ring-0 focus-visible:ring-0"
                                onClick={() => {
                                  handleThumbsDown()
                                  toast({
                                    title: "Thanks for your feedback!",
                                    description: "We'll work on improving our responses",
                                    duration: 2000,
                                  })
                                }}
                              >
                                <ThumbsDown className="h-4 w-4 mr-1" />
                                <span className="text-sm">Not helpful</span>
                              </Button>
                            </div>
                          )}
                        </div>
                        {message.id === "welcome" && (
                          <div className={`mt-6 flex flex-col gap-3 ${isLimitReached() || isLoading ? 'opacity-50 pointer-events-none' : ''}`}>
                            {EXAMPLE_QUESTIONS.map((question, index) => (
                              <Button
                                key={index}
                                variant="ghost"
                                className="w-full h-12 justify-start text-left border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all text-gray-600 hover:text-blue-700 rounded-lg shadow-sm"
                                onClick={() => handleExampleQuestion(question)}
                                disabled={isLimitReached() || isLoading}
                              >
                                <div className="flex items-center w-full">
                                  <Send className="h-4 w-4 shrink-0 text-blue-500 mr-3" />
                                  <span className={`font-medium ${isLoading ? 'text-gray-400' : ''}`}>{question}</span>
                                </div>
                              </Button>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>

              {message.role === "user" && (message.thinking || message.isThinking) && (
                <Collapsible open={message.isThinkingExpanded}>
                  <Card>
                    <CardContent className="p-4">
                      <CollapsibleTrigger
                        asChild
                        onClick={() => {
                          if (!message.isThinking) {
                            toggleThinking(message.id)
                          }
                        }}
                      >
                        <div className="flex items-center gap-2 cursor-pointer">
                          {message.isThinking ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                          ) : (
                            <Lightbulb className="h-5 w-5" />
                          )}
                          <span>Thoughts</span>
                          {message.isThinking && (
                            <span className="text-sm text-muted-foreground">
                              ({elapsedTime}s)
                            </span>
                          )}
                          <ChevronDown
                            className={`h-4 w-4 transition-transform ${message.isThinkingExpanded ? "" : "-rotate-90"}`}
                          />
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-2">
                        <div
                          className="text-sm text-muted-foreground whitespace-pre-wrap h-40 overflow-y-auto"
                          ref={(el) => {
                            if (el) {
                              el.scrollTo(0, el.scrollHeight)
                            }
                          }}
                        >
                          {message.thinking || (message.isThinking && !message.thinking ? "Đang xử lý..." : "")}
                        </div>
                      </CollapsibleContent>
                    </CardContent>
                  </Card>
                </Collapsible>
              )}
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="p-4 border-t">
        <form onSubmit={onSubmit} className="max-w-3xl mx-auto flex items-center gap-3">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value)
              // Show limit dialog if reached and user starts typing
              if (isLimitReached() && e.target.value.trim()) {
                setShowLimitDialog(true)
              }
            }}
            placeholder={`How can ${BOT_NAME} help?`}
            className="flex-1 text-base px-4 h-14"
            disabled={isLoading}
          />
          <Button 
            type="submit" 
            variant="ghost" 
            size="icon"
            className="h-14 w-14 shrink-0 flex items-center justify-center" 
            disabled={isLoading || !input.trim()}
          >
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <Send className="h-6 w-6" />
            )}
          </Button>
        </form>
      </div>

      {/* Limit Reached Dialog */}
      <Dialog open={showLimitDialog} onOpenChange={setShowLimitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Giới hạn câu hỏi</DialogTitle>
            <DialogDescription>
              Đây là bản demo, chỉ cho phép {MAX_QUESTIONS} câu hỏi mỗi phiên chat. Xin cảm ơn bạn đã thử nghiệm!
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowLimitDialog(false)}>
              Đóng
            </Button>
            <Button onClick={clearSession}>
              Chat mới
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Toast notifications */}
      <Toaster />
    </div>
  )
}

