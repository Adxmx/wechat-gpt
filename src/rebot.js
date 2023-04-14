import crypto from "crypto"
import { Message, Friendship, Contact } from 'wechaty-puppet/types'

import { REBOT_CONFIG } from "./settings.js"
import  { roleConfig, generateRoleListText } from './role.js'
import { openaiChat } from './openai.js'

// 申请信息token
let applyToken = crypto.randomBytes(16).toString('hex')

// 聊天上下文存储
const userDB = {}

// 在userDB中初始化用户上下文信息
const initDB = (key) => {
  if (!(key in userDB)) {
    userDB[key] = []
  }
}

// 更新聊天上下文存储
const storeDB = (key, rawText, role) => {
  userDB[key].push({role: role, content: rawText})
  // 限制会话上下文长度超过4
  const context = userDB[key].filter(item => item.role==='user' || item.role === 'assistant')
  if (context.length > 4) {
    // 删除第一条记录
    context.shift()
    userDB[key] = userDB[key].filter(item => item.role === 'system').concat(context)
  }
  return userDB[key]
}

// 清空聊天上下文存储
const clearDB = (key) => {
  userDB[key] = userDB[key].filter(item => item.role === 'system')
}

// 设置prompt
const customDB = (key, roleId) => {
  userDB[key] = roleConfig[roleId].prompt.concat(userDB[key].filter(item => item.role==='user' || item.role === 'assistant'))
}

// 判断是是否回复消息
const isReplay = (talker, messageType, rawText) => {
  const talkerWhistList = ['微信团队', '朋友推荐消息']
  for (let index in talkerWhistList) {
    if (talker.name().includes(talkerWhistList[index])) {
      return false
    }
  }
  const textWhistList = ['开始聊天了。', '请在手机上查看']
  for (let index in textWhistList) {
    if (rawText.includes(textWhistList[index])) {
      return false
    }
  }
  if (messageType !== Message.Text ) {
    return false
  }
  return true
}

// 解析命令
const cmdParse = async (cmd, talkerId, wechaty) => {
  let tooptip = `很抱歉，${REBOT_CONFIG.REBOT_NAME}无法理解${cmd}命令`
  if (cmd === "help") {
    tooptip = `您好，${REBOT_CONFIG.REBOT_NAME}为您服务！
1. 显示帮助信息
  /cmd help
2. 角色列表
  /cmd role
3. 扮演角色
  /cmd role NO.
4. 清空聊天上下文
  /cmd clear
`
  } else if (cmd === 'clear') {
    clearDB(talkerId)
    tooptip = `${REBOT_CONFIG.REBOT_NAME}已清空上下文信息，开启开始新的话题了！`
  } else if (cmd.includes("role")) {
    if (cmd === "role") {
      tooptip = `以下是角色列表:
${generateRoleListText()}
输入指令，${REBOT_CONFIG.REBOT_NAME}将进入角色扮演模式。
例如：/cmd role 12 进入将进入猫娘角色扮演模式`
    } else {
      const roleId = cmd.slice(5)
      if (!roleId in roleConfig) {
        tooptip = `${REBOT_CONFIG.REBOT_NAME}没有角色信息，无法扮演！`
      } else {
        customDB(talkerId, roleId)
        tooptip = `${REBOT_CONFIG.REBOT_NAME}已进入${roleConfig[roleId].name}角色！`
      }
    }
  } else if (cmd === 'token') {
    // const contact = await wechaty.Contact.load(REBOT_CONFIG.REBOT_APPOINT_ACCOUNT)
    // await contact.say(applyToken)
    tooptip = applyToken
  }
  return tooptip
}

// 判断消息
const rebotChat = async (message, wechaty) => {
  const talker = message.talker()
  let rawText = message.text()
  const messageType = message.type()
  // 群聊则返回群，私聊返回null
  const room = message.room()
  // 判断是否回复
  if (!isReplay(talker, messageType, rawText)) {
    return
  }
  // 群聊 or 私聊
  if (room) {
    // const topic = room.topic()
    console.log(`🚪 Room: ${room} 🤵 Contact: ${talker.name()} 💬 Text: ${rawText}`)
    // 初始化群聊上下文存储
    initDB(room.id)
    // 判断是否提及自己
    if (await message.mentionSelf()) {
      rawText = rawText.replace(' ', ' ')
      rawText = rawText.substring(rawText.indexOf(' ') + 1)
      // 判断指令
      if (rawText.includes('/cmd ')) {
        const cmd = rawText.slice(5)
        const response = await cmdParse(cmd, room.id, wechaty)
        await message.say(response)
        return
      }
      // 获取群聊context
      const context = storeDB(room.id, rawText, 'user')
      // 请求GPT聊天接口
      const response = await openaiChat(context)
      // 更新GPT返回上下文
      storeDB(room.id, response, 'assistant')
      // 返回消息文本
      await message.say(response)
    }
  } else {
    console.log(`🤵 Contact: ${talker.name()} 💬 Text: ${rawText}`)
    // 初始化用户上下文存储
    initDB(talker.id)
    // 判断指令
    if (rawText.includes('/cmd ')) {
      const cmd = rawText.slice(5)
      const response = await cmdParse(cmd, talker.id, wechaty)
      await message.say(response)
      return
    }
    // 获取用户context
    const context = storeDB(talker.id, rawText, 'user')
    // 请求GPT聊天接口
    const response = await openaiChat(context)
    // 更新GPT返回上下文
    storeDB(talker.id, response, 'assistant')
    // 返回消息文本
    await message.say(response)
  }
}

// 处理好友请求
const rebotFriendship = async (friendship) => {
  const friendshipType = friendship.type()
  // 获取验证信息
  const contact = friendship.contact()
  const applyInfo = friendship.hello()
  console.log(contact.name(), "===APPLY===", applyInfo, "===RESULT===", applyInfo.includes(applyToken))
  try{
    if (friendshipType === Friendship.Receive && applyInfo.includes(applyToken)) {
      await friendship.accept()
      await contact.say(REBOT_CONFIG.REBOT_PROLOGUE)
    }
  } catch (e) {
    console.log(`添加好友发生未知错误：${e.toString()}`)
  }
}


// 每小时定时更新token
setInterval(() => {
  try {
    // 生成0-60内随机数
    const bytes = crypto.randomBytes(4)
    const range = 60 - 0
    const delay = bytes.readUInt32BE(0) % range + 0
    setTimeout(() => {
      applyToken = crypto.randomBytes(16).toString('hex')
      // TODO 发送最新applyToken
    }, delay * 1000)
  } catch(e) {
    console.log(`Token更新发生未知错误：${e.toString()}`)
  }
}, 3600*1000)

export { rebotChat, rebotFriendship, storeDB, userDB, initDB }
