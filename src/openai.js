import { Configuration, OpenAIApi } from "openai"
import { OPEN_CONFIG } from "./settings.js"

const configuration = new Configuration({
  apiKey: OPEN_CONFIG.OPENAI_API_KEY,
})

const openai = new OpenAIApi(configuration)

// openai交流
const openaiChat = async (context) => {
  try {
    console.log(context)
    const response = await openai.createChatCompletion({
      model: OPEN_CONFIG.OPENAI_API_MODEL,
      messages: context,
      temperature: parseFloat(OPEN_CONFIG.OPENAI_API_TEMPERATURE),
      n:1,
      // stream: true
      max_tokens: parseInt(OPEN_CONFIG.OPENAI_API_MAX_TOKENS)
    })
    return response.data.choices[0].message.content
  } catch(e) {
    return `很抱歉发生未知错误：${e.toString()}，能否能把这个问题反馈给我的主人？`
  }
}

export { openaiChat }

