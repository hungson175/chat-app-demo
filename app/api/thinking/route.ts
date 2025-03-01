import { NextResponse } from "next/server"

export const runtime = "edge"

export async function GET() {
  const encoder = new TextEncoder()

  async function* generateThinkingProcess() {
    const steps = [
      "1. Analyzing the context and requirements...\n",
      "2. Gathering relevant information from available sources...\n",
      "3. Evaluating potential approaches and solutions...\n",
      "4. Considering best practices and industry standards...\n",
      "5. Formulating a comprehensive response...\n",
      "6. Validating the solution against requirements...\n",
      "7. Preparing final response with detailed explanations...\n",
    ]

    for (const step of steps) {
      yield encoder.encode(step)
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
  }

  const stream = new ReadableStream({
    async start(controller) {
      for await (const chunk of generateThinkingProcess()) {
        controller.enqueue(chunk)
      }
      controller.close()
    },
  })

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
    },
  })
}

