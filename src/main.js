import { bootstrap } from "global-agent"
import { WechatyBuilder } from "wechaty"
import QRCode from "qrcode"

import { rebotChat, rebotFriendship } from './rebot.js'

bootstrap()

// 获取程序启动时间
const currentAt = Date.now()
const wechaty = WechatyBuilder.build({
  name: "wechat-gpt",
  puppet: "wechaty-puppet-wechat",
  puppetOptions: {
    uos: true
  }
})

wechaty
  .on('scan', async (qrcode, status) => {
    console.log(`Scan QR Code to login: ${status}\nhttps://wechaty.js.org/qrcode/${encodeURIComponent(qrcode)}`)
    console.log(await QRCode.toString(qrcode, { type: 'terminal', small: true }))
  })
  .on('login', user => {
    console.log(`User ${user} logged in at ${currentAt}`)
  })
  .on('friendship', async (friendship) => {
    rebotFriendship(friendship)
  })
  .on('message', async (message) => {
    if (message.date().getTime() < currentAt) {
      return
    }
    // 忽略自己接受到的消息
    if (message.self()) {
      return
    }
    // 会话测试
    if (message.text().startsWith("/adxm")) {
      await message.say("adxm")
      return
    }
    // 传递给机器人分析
    try{
      rebotChat(message, wechaty)
    } catch (e) {
      message.say(`很抱歉发生未知错误：${e.toString()}，能否能把这个问题反馈给我的主人？`)
    }
  })

try {
  wechaty.start()
} catch (e) {
  console.log(e)
}