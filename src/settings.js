import dotenv from "dotenv"
import dotenvExpand from "dotenv-expand"

dotenvExpand.expand(dotenv.config())

const OPEN_CONFIG = {
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  OPENAI_API_MODEL: process.env.OPENAI_API_MODEL,
  OPENAI_API_TEMPERATURE: parseFloat(process.env.OPENAI_API_TEMPERATURE),
  OPENAI_API_MAX_TOKENS: parseInt(process.env.OPENAI_API_MAX_TOKENS)
}

const REBOT_CONFIG = {
  REBOT_APPOINT_ACCOUNT: process.env.REBOT_APPOINT_ACCOUNT,
  REBOT_NAME: process.env.REBOT_NAME
}

export { OPEN_CONFIG, REBOT_CONFIG }