import { StreamingTextResponse } from "ai"

export const runtime = "edge"

export async function POST(req: Request) {
  const { messages } = await req.json()
  const lastMessage = messages[messages.length - 1].content
  const encoder = new TextEncoder()

  async function* streamResponse() {
    if (lastMessage.toLowerCase() === "long") {
      const longText = `This is a very long response that will be streamed word by word to test the scrolling functionality. 
      It contains multiple paragraphs and will take some time to fully appear.

      Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
      Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.

      Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.
      Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.`

      const words = longText.split(" ")
      let currentLine = ""

      for (const word of words) {
        currentLine += word + " "
        if (currentLine.length > 50 || word.includes("\n")) {
          yield encoder.encode(currentLine)
          currentLine = ""
          await new Promise((resolve) => setTimeout(resolve, 100))
        }
      }
      if (currentLine) {
        yield encoder.encode(currentLine)
      }
    } else {
      const response = `Hello! I received your message: "${lastMessage}". How can I help you further?`
      const words = response.split(" ")

      for (const word of words) {
        yield encoder.encode(word + " ")
        await new Promise((resolve) => setTimeout(resolve, 100))
      }
    }
  }

  const stream = new ReadableStream({
    async start(controller) {
      for await (const chunk of streamResponse()) {
        controller.enqueue(chunk)
      }
      controller.close()
    },
  })

  return new StreamingTextResponse(stream)
}

