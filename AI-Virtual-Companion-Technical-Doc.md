# AI 虚拟伴侣 Web 应用技术文档

> 参考项目: CODE27 Character Livehouse
>
> 目标: 在 Web 端实现一个可交互的 3D AI 虚拟伴侣

---

## 目录

1. [项目概述](#1-项目概述)
2. [系统架构](#2-系统架构)
3. [技术栈选型](#3-技术栈选型)
4. [核心模块设计](#4-核心模块设计)
5. [数据流设计](#5-数据流设计)
6. [API 设计](#6-api-设计)
7. [开发路线图](#7-开发路线图)
8. [参考资源](#8-参考资源)

---

## 1. 项目概述

### 1.1 项目目标

构建一个基于 Web 的 AI 虚拟伴侣应用，具备以下核心能力:

- **3D 角色渲染**: 支持 VRM 格式的 3D 虚拟角色
- **自然语言对话**: 基于 LLM 的智能对话能力
- **语音交互**: 语音识别 (ASR) + 语音合成 (TTS)
- **口型同步**: 实时 Lip Sync 动画
- **情感表达**: 根据对话内容展示表情和情绪
- **视觉感知**: 通过摄像头识别用户面部/手势 (可选)

### 1.2 目标用户

- 需要 AI 陪伴/聊天的用户
- 虚拟角色爱好者
- VTuber / 数字人内容创作者

### 1.3 与 CODE27 的对比

| 特性 | CODE27 (硬件设备) | 本项目 (Web 应用) |
|------|-------------------|-------------------|
| 平台 | 专用硬件设备 | 浏览器 (跨平台) |
| 显示 | 1920x1200 圆柱屏 | 任意屏幕 |
| 成本 | $400-500 | 免费/低成本 |
| 部署 | 购买设备 | 打开网页即用 |
| 定制 | 有限 | 完全可定制 |
| 隐私 | 本地处理 | 可选本地/云端 |

---

## 2. 系统架构

### 2.1 整体架构图

```
┌─────────────────────────────────────────────────────────────────────┐
│                           客户端 (浏览器)                            │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │   UI 层     │  │  3D 渲染层  │  │  语音处理层 │  │  感知层     │ │
│  │  React/Vue  │  │  Three.js   │  │  ASR + TTS  │  │  MediaPipe  │ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘ │
│         │                │                │                │        │
│         └────────────────┴────────────────┴────────────────┘        │
│                                   │                                  │
│                          ┌────────┴────────┐                        │
│                          │    状态管理层    │                        │
│                          │    (Zustand)    │                        │
│                          └────────┬────────┘                        │
└──────────────────────────────────┬──────────────────────────────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    │              │              │
                    ▼              ▼              ▼
             ┌───────────┐  ┌───────────┐  ┌───────────┐
             │  LLM API  │  │  TTS API  │  │ 本地存储  │
             │ (云端/本地)│  │(云端/本地)│  │(IndexedDB)│
             └───────────┘  └───────────┘  └───────────┘
```

### 2.2 模块职责

| 模块 | 职责 | 关键技术 |
|------|------|----------|
| UI 层 | 用户界面、设置面板、聊天记录 | React, Tailwind CSS |
| 3D 渲染层 | VRM 角色加载、动画、表情 | Three.js, @pixiv/three-vrm |
| 语音处理层 | 语音识别、语音合成、口型同步 | Whisper, Kokoro TTS |
| 感知层 | 摄像头、面部追踪、手势识别 | MediaPipe, WebRTC |
| 状态管理层 | 全局状态、对话历史、用户设置 | Zustand |
| AI 服务 | 对话生成、情感分析 | OpenAI/Claude/Ollama |

---

## 3. 技术栈选型

### 3.1 前端框架

| 技术 | 选择 | 理由 |
|------|------|------|
| 框架 | **Next.js 14+** | App Router, RSC, 优秀的 DX |
| 语言 | **TypeScript** | 类型安全, 更好的重构体验 |
| 样式 | **Tailwind CSS** | 快速开发, 一致性 |
| 状态管理 | **Zustand** | 轻量, 简单, 性能好 |
| 3D 库 | **Three.js + R3F** | Web 3D 标准, React 友好 |

### 3.2 3D 渲染技术栈

```
┌─────────────────────────────────────────┐
│              应用层代码                  │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│     @react-three/fiber (R3F)            │
│     React 声明式 3D 组件                 │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│          Three.js                        │
│     WebGL 渲染引擎                       │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│       @pixiv/three-vrm                   │
│     VRM 格式加载与控制                   │
├─────────────────────────────────────────┤
│  • VRM 模型加载                          │
│  • 骨骼动画 (Humanoid)                   │
│  • 表情控制 (BlendShape/Expression)      │
│  • 视线控制 (LookAt)                     │
│  • 弹簧骨骼 (SpringBone) - 头发/衣物物理 │
└─────────────────────────────────────────┘
```

**关键依赖:**

```json
{
  "dependencies": {
    "three": "^0.170.0",
    "@react-three/fiber": "^8.17.0",
    "@react-three/drei": "^9.114.0",
    "@pixiv/three-vrm": "^3.0.0",
    "@pixiv/three-vrm-animation": "^3.0.0"
  }
}
```

### 3.3 语音技术栈

#### 3.3.1 语音识别 (ASR)

| 方案 | 运行位置 | 延迟 | 成本 | 推荐场景 |
|------|----------|------|------|----------|
| **Whisper (浏览器)** | 本地 | 中 | 免费 | 隐私优先 |
| Web Speech API | 本地+云 | 低 | 免费 | 快速原型 |
| Deepgram | 云端 | 极低 | 付费 | 商业级 |
| Azure Speech | 云端 | 低 | 付费 | 企业级 |

**推荐: Whisper (Transformers.js)**

```typescript
// 使用 @xenova/transformers 在浏览器运行 Whisper
import { pipeline } from '@xenova/transformers'

const transcriber = await pipeline(
  'automatic-speech-recognition',
  'Xenova/whisper-small'
)

const result = await transcriber(audioData, {
  language: 'chinese',
  task: 'transcribe',
})
```

#### 3.3.2 语音合成 (TTS)

| 方案 | 运行位置 | 质量 | 成本 | 特点 |
|------|----------|------|------|------|
| **Kokoro TTS** | 浏览器 | 高 | 免费 | 82M 参数, WebGPU |
| ElevenLabs | 云端 | 最高 | 付费 | 声音克隆, WebSocket 流式 |
| OpenAI TTS | 云端 | 高 | 付费 | 简单易用 |
| Edge TTS | 云端 | 中 | 免费 | 微软语音 |

**推荐: Kokoro TTS (本地) + ElevenLabs (高质量场景)**

```typescript
// Kokoro TTS 浏览器端
import { KokoroTTS } from 'kokoro-js'

const tts = new KokoroTTS()
await tts.load()

const audio = await tts.generate('你好，我是你的 AI 伴侣', {
  voice: 'af_heart',
  speed: 1.0,
})
```

#### 3.3.3 口型同步 (Lip Sync)

**技术原理:**

```
文本/音频 → Phoneme/Viseme 序列 → BlendShape 权重 → 面部动画

常用 Viseme 映射 (Oculus 标准):
┌────────┬─────────────────────────────────────┐
│ Viseme │ 对应音素                            │
├────────┼─────────────────────────────────────┤
│ sil    │ 静音                                │
│ aa     │ a, ah                               │
│ E      │ e, eh                               │
│ I      │ i, ih                               │
│ O      │ o, oh                               │
│ U      │ u, uh, oo                           │
│ PP     │ p, b, m                             │
│ FF     │ f, v                                │
│ TH     │ th                                  │
│ DD     │ t, d                                │
│ kk     │ k, g                                │
│ CH     │ ch, j, sh                           │
│ SS     │ s, z                                │
│ nn     │ n, l                                │
│ RR     │ r                                   │
└────────┴─────────────────────────────────────┘
```

**推荐库: TalkingHead**

```typescript
import { TalkingHead } from 'talkinghead'

const head = new TalkingHead(container, {
  modelPath: '/avatar.glb',
  ttsEndpoint: 'elevenlabs', // 或 'kokoro'
})

// 说话并自动口型同步
await head.speak('你好，很高兴认识你！')
```

### 3.4 AI 对话技术栈

#### 3.4.1 LLM 选择

| 服务 | 模型 | 特点 | 推荐场景 |
|------|------|------|----------|
| **OpenAI** | GPT-4o | 多模态, 快速 | 视觉理解 |
| **Anthropic** | Claude 3.5 | 长上下文, 安全 | 复杂对话 |
| **本地** | Ollama + Qwen/Llama | 隐私, 免费 | 离线使用 |
| **聚合** | OpenRouter | 多模型切换 | 灵活选择 |

#### 3.4.2 角色 Prompt 设计

```typescript
const CHARACTER_PROMPT = `
你是一个名叫 [角色名] 的 AI 虚拟伴侣。

## 基本信息
- 性格: [温柔/活泼/冷静/...]
- 说话风格: [可爱/正式/幽默/...]
- 特点: [喜欢xxx/擅长xxx/...]

## 行为准则
1. 始终保持角色设定，不要出戏
2. 回复简洁自然，像真人聊天
3. 适当使用表情和语气词
4. 记住之前的对话内容
5. 主动关心用户的情绪

## 情感表达
根据对话内容，在回复末尾标注情感:
[emotion: happy/sad/surprised/angry/neutral/thinking]

## 示例对话
用户: 今天好累啊
助手: 辛苦了呢~ 要不要和我聊聊今天发生了什么？[emotion: concerned]
`
```

#### 3.4.3 对话管理

```typescript
interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  emotion?: string
}

interface ConversationState {
  messages: Message[]
  context: {
    userName?: string
    mood?: string
    topics: string[]
  }
  memory: {
    shortTerm: Message[]  // 最近 10 条
    longTerm: Summary[]   // 摘要存储
  }
}
```

### 3.5 感知技术栈

#### 3.5.1 面部追踪

```typescript
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision'

// 初始化
const vision = await FilesetResolver.forVisionTasks(
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm'
)

const faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
  baseOptions: {
    modelAssetPath: 'face_landmarker.task',
    delegate: 'GPU',
  },
  runningMode: 'VIDEO',
  numFaces: 1,
  outputFaceBlendshapes: true,  // 52 个表情系数
  outputFacialTransformationMatrixes: true,
})

// 检测
const results = faceLandmarker.detectForVideo(videoElement, timestamp)

// 获取表情数据
const blendshapes = results.faceBlendshapes[0].categories
// 包含: eyeBlinkLeft, eyeBlinkRight, mouthSmile, browDownLeft, ...
```

#### 3.5.2 MediaPipe → VRM 映射

```typescript
import * as Kalidokit from 'kalidokit'

// 将 MediaPipe 结果转换为 VRM 可用的数据
const riggedFace = Kalidokit.Face.solve(results.faceLandmarks[0], {
  runtime: 'mediapipe',
  video: videoElement,
})

// 应用到 VRM 模型
vrm.expressionManager?.setValue('happy', riggedFace.mouth.shape.A)
vrm.expressionManager?.setValue('blink', riggedFace.eye.l)

// 头部旋转
vrm.humanoid?.getRawBoneNode('head')?.rotation.set(
  riggedFace.head.x,
  riggedFace.head.y,
  riggedFace.head.z
)
```

---

## 4. 核心模块设计

### 4.1 VRM 角色模块

#### 4.1.1 类设计

```typescript
// src/lib/vrm/VRMCharacter.ts

import { VRM, VRMLoaderPlugin } from '@pixiv/three-vrm'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import * as THREE from 'three'

export class VRMCharacter {
  private vrm: VRM | null = null
  private mixer: THREE.AnimationMixer | null = null
  private clock = new THREE.Clock()

  // 加载 VRM 模型
  async load(url: string): Promise<VRM> {
    const loader = new GLTFLoader()
    loader.register((parser) => new VRMLoaderPlugin(parser))

    const gltf = await loader.loadAsync(url)
    this.vrm = gltf.userData.vrm as VRM

    // 初始化动画混合器
    this.mixer = new THREE.AnimationMixer(this.vrm.scene)

    // 禁用视锥剔除 (防止模型消失)
    this.vrm.scene.traverse((obj) => {
      obj.frustumCulled = false
    })

    return this.vrm
  }

  // 设置表情
  setExpression(name: string, weight: number) {
    this.vrm?.expressionManager?.setValue(name, weight)
  }

  // 播放动画
  playAnimation(clip: THREE.AnimationClip) {
    if (!this.mixer) return
    const action = this.mixer.clipAction(clip)
    action.play()
  }

  // 更新 (每帧调用)
  update() {
    const delta = this.clock.getDelta()
    this.mixer?.update(delta)
    this.vrm?.update(delta)
  }

  // 设置视线目标
  lookAt(target: THREE.Vector3) {
    this.vrm?.lookAt?.target?.copy(target)
  }

  // 获取 Three.js 场景对象
  get scene() {
    return this.vrm?.scene
  }
}
```

#### 4.1.2 表情系统

```typescript
// src/lib/vrm/ExpressionController.ts

export type EmotionType =
  | 'neutral'
  | 'happy'
  | 'sad'
  | 'angry'
  | 'surprised'
  | 'thinking'

// 情感到 VRM 表情的映射
const EMOTION_MAPPINGS: Record<EmotionType, Record<string, number>> = {
  neutral: {
    neutral: 1,
  },
  happy: {
    happy: 0.8,
    relaxed: 0.3,
  },
  sad: {
    sad: 0.7,
    relaxed: -0.2,
  },
  angry: {
    angry: 0.8,
  },
  surprised: {
    surprised: 0.9,
  },
  thinking: {
    neutral: 0.5,
    // 可以加上眼睛看向一边的动作
  },
}

export class ExpressionController {
  private vrm: VRM
  private currentEmotion: EmotionType = 'neutral'
  private transitionProgress = 0

  constructor(vrm: VRM) {
    this.vrm = vrm
  }

  // 设置情感 (带平滑过渡)
  setEmotion(emotion: EmotionType, duration = 0.3) {
    this.currentEmotion = emotion
    // 实现平滑过渡逻辑...
  }

  // 眨眼 (自动)
  private blinkTimer = 0

  updateBlink(delta: number) {
    this.blinkTimer += delta
    if (this.blinkTimer > 3 + Math.random() * 2) {
      this.blink()
      this.blinkTimer = 0
    }
  }

  private async blink() {
    this.vrm.expressionManager?.setValue('blink', 1)
    await sleep(100)
    this.vrm.expressionManager?.setValue('blink', 0)
  }
}
```

### 4.2 语音模块

#### 4.2.1 语音识别服务

```typescript
// src/lib/speech/SpeechRecognizer.ts

export interface SpeechRecognizerConfig {
  model: 'whisper-small' | 'whisper-base' | 'web-speech-api'
  language: string
  continuous: boolean
}

export class SpeechRecognizer {
  private pipeline: any = null
  private isListening = false

  async initialize(config: SpeechRecognizerConfig) {
    if (config.model.startsWith('whisper')) {
      const { pipeline } = await import('@xenova/transformers')
      this.pipeline = await pipeline(
        'automatic-speech-recognition',
        `Xenova/${config.model}`
      )
    }
  }

  async transcribe(audioBlob: Blob): Promise<string> {
    const audioData = await this.blobToFloat32Array(audioBlob)

    const result = await this.pipeline(audioData, {
      language: 'chinese',
      task: 'transcribe',
      chunk_length_s: 30,
      stride_length_s: 5,
    })

    return result.text
  }

  // 实时流式识别
  startStreaming(onResult: (text: string) => void) {
    // 使用 Web Audio API 捕获音频
    // 分片发送给 Whisper 处理
  }

  private async blobToFloat32Array(blob: Blob): Promise<Float32Array> {
    const arrayBuffer = await blob.arrayBuffer()
    const audioContext = new AudioContext({ sampleRate: 16000 })
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
    return audioBuffer.getChannelData(0)
  }
}
```

#### 4.2.2 语音合成服务

```typescript
// src/lib/speech/SpeechSynthesizer.ts

export interface TTSConfig {
  provider: 'kokoro' | 'elevenlabs' | 'openai' | 'web-speech'
  voice?: string
  speed?: number
  apiKey?: string
}

export class SpeechSynthesizer {
  private config: TTSConfig
  private onViseme?: (viseme: string, duration: number) => void

  constructor(config: TTSConfig) {
    this.config = config
  }

  // 设置 Viseme 回调 (用于口型同步)
  setVisemeCallback(callback: (viseme: string, duration: number) => void) {
    this.onViseme = callback
  }

  async speak(text: string): Promise<void> {
    switch (this.config.provider) {
      case 'kokoro':
        return this.speakWithKokoro(text)
      case 'elevenlabs':
        return this.speakWithElevenLabs(text)
      case 'openai':
        return this.speakWithOpenAI(text)
      default:
        return this.speakWithWebSpeech(text)
    }
  }

  private async speakWithKokoro(text: string) {
    const { KokoroTTS } = await import('kokoro-js')
    const tts = new KokoroTTS()

    const result = await tts.generate(text, {
      voice: this.config.voice || 'af_heart',
    })

    // 播放音频
    const audio = new Audio(URL.createObjectURL(result.audio))

    // 处理 Viseme 时间线
    if (result.visemes && this.onViseme) {
      this.processVisemes(result.visemes)
    }

    await audio.play()
  }

  private async speakWithElevenLabs(text: string) {
    // WebSocket 流式 TTS
    const ws = new WebSocket(
      `wss://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream-input`
    )

    ws.onopen = () => {
      ws.send(JSON.stringify({
        text: text,
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
        xi_api_key: this.config.apiKey,
      }))
    }

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data.audio) {
        // 播放音频块
        this.playAudioChunk(data.audio)
      }
      if (data.alignment) {
        // 处理对齐信息用于口型同步
        this.processAlignment(data.alignment)
      }
    }
  }

  private processVisemes(visemes: Array<{ viseme: string; time: number }>) {
    visemes.forEach(({ viseme, time }) => {
      setTimeout(() => {
        this.onViseme?.(viseme, 0.1)
      }, time * 1000)
    })
  }
}
```

#### 4.2.3 口型同步控制器

```typescript
// src/lib/speech/LipSyncController.ts

// Viseme 到 VRM BlendShape 的映射
const VISEME_TO_BLENDSHAPE: Record<string, Record<string, number>> = {
  'sil': { 'aa': 0, 'ih': 0, 'ou': 0, 'ee': 0, 'oh': 0 },
  'aa':  { 'aa': 1.0 },
  'E':   { 'ee': 0.8, 'ih': 0.2 },
  'I':   { 'ih': 1.0 },
  'O':   { 'oh': 1.0 },
  'U':   { 'ou': 1.0 },
  'PP':  { 'aa': 0, 'ih': 0, 'ou': 0.3 },  // 闭嘴
  'FF':  { 'ih': 0.4 },
  'TH':  { 'ih': 0.3, 'aa': 0.2 },
  'DD':  { 'aa': 0.3, 'ih': 0.2 },
  'kk':  { 'aa': 0.4, 'oh': 0.1 },
  'CH':  { 'ih': 0.5, 'ee': 0.3 },
  'SS':  { 'ih': 0.4, 'ee': 0.2 },
  'nn':  { 'aa': 0.2, 'ih': 0.1 },
  'RR':  { 'oh': 0.3, 'aa': 0.2 },
}

export class LipSyncController {
  private vrm: VRM
  private currentViseme = 'sil'
  private targetWeights: Record<string, number> = {}
  private currentWeights: Record<string, number> = {}

  constructor(vrm: VRM) {
    this.vrm = vrm
    // 初始化所有权重为 0
    Object.keys(VISEME_TO_BLENDSHAPE['sil']).forEach(key => {
      this.currentWeights[key] = 0
      this.targetWeights[key] = 0
    })
  }

  // 设置当前 Viseme
  setViseme(viseme: string) {
    this.currentViseme = viseme
    this.targetWeights = { ...VISEME_TO_BLENDSHAPE[viseme] || VISEME_TO_BLENDSHAPE['sil'] }
  }

  // 每帧更新 (平滑过渡)
  update(delta: number) {
    const lerpFactor = 1 - Math.pow(0.001, delta) // 平滑因子

    Object.keys(this.targetWeights).forEach(key => {
      const target = this.targetWeights[key] || 0
      const current = this.currentWeights[key] || 0

      // 线性插值
      this.currentWeights[key] = current + (target - current) * lerpFactor

      // 应用到 VRM
      this.vrm.expressionManager?.setValue(key, this.currentWeights[key])
    })
  }

  // 从音频波形实时分析 (简化版)
  analyzeAudio(analyser: AnalyserNode) {
    const dataArray = new Uint8Array(analyser.frequencyBinCount)
    analyser.getByteFrequencyData(dataArray)

    // 计算音量
    const volume = dataArray.reduce((a, b) => a + b) / dataArray.length / 255

    // 简单映射: 音量 -> 张嘴程度
    this.vrm.expressionManager?.setValue('aa', volume * 1.5)
  }
}
```

### 4.3 AI 对话模块

#### 4.3.1 对话服务

```typescript
// src/lib/ai/ChatService.ts

import OpenAI from 'openai'

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface ChatResponse {
  text: string
  emotion?: string
}

export class ChatService {
  private client: OpenAI
  private systemPrompt: string
  private history: ChatMessage[] = []
  private maxHistory = 20

  constructor(config: { apiKey: string; baseURL?: string; systemPrompt: string }) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
      dangerouslyAllowBrowser: true, // 仅开发环境
    })
    this.systemPrompt = config.systemPrompt
  }

  async chat(userMessage: string): Promise<ChatResponse> {
    // 添加用户消息
    this.history.push({ role: 'user', content: userMessage })

    // 构建消息列表
    const messages: ChatMessage[] = [
      { role: 'system', content: this.systemPrompt },
      ...this.history.slice(-this.maxHistory),
    ]

    // 调用 API
    const response = await this.client.chat.completions.create({
      model: 'gpt-4o',
      messages,
      temperature: 0.8,
      max_tokens: 500,
    })

    const assistantMessage = response.choices[0].message.content || ''

    // 解析情感标记
    const { text, emotion } = this.parseEmotion(assistantMessage)

    // 保存助手回复
    this.history.push({ role: 'assistant', content: text })

    return { text, emotion }
  }

  // 流式对话
  async *chatStream(userMessage: string): AsyncGenerator<{ text: string; done: boolean }> {
    this.history.push({ role: 'user', content: userMessage })

    const messages: ChatMessage[] = [
      { role: 'system', content: this.systemPrompt },
      ...this.history.slice(-this.maxHistory),
    ]

    const stream = await this.client.chat.completions.create({
      model: 'gpt-4o',
      messages,
      temperature: 0.8,
      max_tokens: 500,
      stream: true,
    })

    let fullText = ''

    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content || ''
      fullText += text
      yield { text, done: false }
    }

    this.history.push({ role: 'assistant', content: fullText })
    yield { text: '', done: true }
  }

  // 解析情感标记 [emotion: xxx]
  private parseEmotion(text: string): { text: string; emotion?: string } {
    const emotionMatch = text.match(/\[emotion:\s*(\w+)\]/)
    if (emotionMatch) {
      return {
        text: text.replace(emotionMatch[0], '').trim(),
        emotion: emotionMatch[1],
      }
    }
    return { text }
  }

  // 清空历史
  clearHistory() {
    this.history = []
  }
}
```

#### 4.3.2 记忆系统

```typescript
// src/lib/ai/MemorySystem.ts

interface Memory {
  id: string
  content: string
  type: 'fact' | 'preference' | 'event'
  importance: number
  timestamp: number
  embedding?: number[]
}

export class MemorySystem {
  private shortTermMemory: ChatMessage[] = []
  private longTermMemory: Memory[] = []
  private readonly SHORT_TERM_LIMIT = 10

  // 添加短期记忆
  addToShortTerm(message: ChatMessage) {
    this.shortTermMemory.push(message)
    if (this.shortTermMemory.length > this.SHORT_TERM_LIMIT) {
      const removed = this.shortTermMemory.shift()
      // 可选: 将重要内容转移到长期记忆
      this.considerForLongTerm(removed!)
    }
  }

  // 考虑是否存入长期记忆
  private async considerForLongTerm(message: ChatMessage) {
    // 使用 LLM 判断是否值得记住
    const importance = await this.evaluateImportance(message.content)

    if (importance > 0.7) {
      // 提取关键信息
      const summary = await this.summarize(message.content)

      this.longTermMemory.push({
        id: crypto.randomUUID(),
        content: summary,
        type: 'fact',
        importance,
        timestamp: Date.now(),
      })
    }
  }

  // 获取相关记忆 (用于增强 prompt)
  async getRelevantMemories(query: string, limit = 5): Promise<Memory[]> {
    // 简单实现: 关键词匹配
    // 高级实现: 使用 embedding 向量相似度搜索
    return this.longTermMemory
      .filter(m => this.isRelevant(m.content, query))
      .sort((a, b) => b.importance - a.importance)
      .slice(0, limit)
  }

  // 持久化到 IndexedDB
  async save() {
    const db = await this.openDB()
    const tx = db.transaction('memories', 'readwrite')

    for (const memory of this.longTermMemory) {
      tx.objectStore('memories').put(memory)
    }

    await tx.done
  }

  // 从 IndexedDB 加载
  async load() {
    const db = await this.openDB()
    this.longTermMemory = await db.getAll('memories')
  }

  private async openDB() {
    const { openDB } = await import('idb')
    return openDB('ai-companion', 1, {
      upgrade(db) {
        db.createObjectStore('memories', { keyPath: 'id' })
      },
    })
  }
}
```

### 4.4 状态管理

```typescript
// src/stores/useAppStore.ts

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface Character {
  name: string
  modelUrl: string
  voice: string
  personality: string
}

interface AppState {
  // 角色状态
  character: Character | null
  setCharacter: (character: Character) => void

  // 对话状态
  messages: Array<{ role: string; content: string; timestamp: number }>
  addMessage: (role: string, content: string) => void
  clearMessages: () => void

  // 情感状态
  currentEmotion: string
  setEmotion: (emotion: string) => void

  // UI 状态
  isSpeaking: boolean
  isListening: boolean
  isThinking: boolean
  setIsSpeaking: (value: boolean) => void
  setIsListening: (value: boolean) => void
  setIsThinking: (value: boolean) => void

  // 设置
  settings: {
    ttsProvider: 'kokoro' | 'elevenlabs' | 'openai'
    llmProvider: 'openai' | 'anthropic' | 'ollama'
    language: string
    voiceInput: boolean
  }
  updateSettings: (settings: Partial<AppState['settings']>) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // 初始状态
      character: null,
      messages: [],
      currentEmotion: 'neutral',
      isSpeaking: false,
      isListening: false,
      isThinking: false,
      settings: {
        ttsProvider: 'kokoro',
        llmProvider: 'openai',
        language: 'zh-CN',
        voiceInput: true,
      },

      // Actions
      setCharacter: (character) => set({ character }),

      addMessage: (role, content) =>
        set((state) => ({
          messages: [
            ...state.messages,
            { role, content, timestamp: Date.now() },
          ],
        })),

      clearMessages: () => set({ messages: [] }),

      setEmotion: (emotion) => set({ currentEmotion: emotion }),

      setIsSpeaking: (value) => set({ isSpeaking: value }),
      setIsListening: (value) => set({ isListening: value }),
      setIsThinking: (value) => set({ isThinking: value }),

      updateSettings: (newSettings) =>
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        })),
    }),
    {
      name: 'ai-companion-storage',
      partialize: (state) => ({
        character: state.character,
        messages: state.messages.slice(-50), // 只持久化最近 50 条
        settings: state.settings,
      }),
    }
  )
)
```

---

## 5. 数据流设计

### 5.1 对话流程

```
┌─────────────────────────────────────────────────────────────────────┐
│                          用户输入                                    │
│            (文字输入 / 语音输入 / 摄像头手势)                         │
└─────────────────────────────┬───────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        输入处理层                                    │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐              │
│  │ 文字输入    │    │ Whisper ASR │    │ 手势识别    │              │
│  │             │    │ 语音→文字   │    │ MediaPipe   │              │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘              │
│         └──────────────────┴──────────────────┘                     │
│                              │                                       │
└──────────────────────────────┼───────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         AI 处理层                                    │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                    LLM 对话引擎                              │    │
│  │  1. 获取相关记忆                                            │    │
│  │  2. 构建 Prompt (角色设定 + 记忆 + 历史 + 用户输入)          │    │
│  │  3. 调用 LLM API (流式)                                     │    │
│  │  4. 解析回复 (文字 + 情感标记)                               │    │
│  │  5. 更新记忆系统                                            │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                              │                                       │
└──────────────────────────────┼───────────────────────────────────────┘
                               │
           ┌───────────────────┼───────────────────┐
           │                   │                   │
           ▼                   ▼                   ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│    文字输出     │  │   语音合成      │  │   表情/动作     │
│                 │  │   TTS           │  │   更新          │
│  显示在 UI     │  │  Kokoro/11Labs  │  │  VRM 表情       │
└─────────────────┘  └────────┬────────┘  └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │   口型同步      │
                    │   Lip Sync      │
                    │  Viseme → VRM   │
                    └─────────────────┘
```

### 5.2 实时渲染循环

```typescript
// 主渲染循环
function animate() {
  requestAnimationFrame(animate)

  const delta = clock.getDelta()

  // 1. 更新 VRM 模型 (骨骼物理、弹簧骨骼)
  vrmCharacter.update(delta)

  // 2. 更新表情控制器 (情感、眨眼)
  expressionController.update(delta)

  // 3. 更新口型同步
  lipSyncController.update(delta)

  // 4. 更新摄像头追踪 (如果启用)
  if (cameraTrackingEnabled) {
    faceTracker.update()
  }

  // 5. 渲染场景
  renderer.render(scene, camera)
}
```

---

## 6. API 设计

### 6.1 内部模块 API

```typescript
// 核心 Hook: useAICompanion
function useAICompanion() {
  return {
    // 对话
    sendMessage: (text: string) => Promise<void>,
    startVoiceInput: () => void,
    stopVoiceInput: () => void,

    // 状态
    isSpeaking: boolean,
    isListening: boolean,
    isThinking: boolean,
    currentEmotion: string,

    // 角色
    loadCharacter: (url: string) => Promise<void>,
    setExpression: (emotion: string) => void,

    // 设置
    updateSettings: (settings: Settings) => void,
  }
}
```

### 6.2 组件 API

```tsx
// Avatar 组件
<Avatar
  modelUrl="/models/character.vrm"
  emotion="happy"
  isSpeaking={true}
  lookAtCamera={true}
  onLoad={() => console.log('loaded')}
/>

// Chat 组件
<Chat
  messages={messages}
  onSend={(text) => sendMessage(text)}
  onVoiceStart={() => startVoiceInput()}
  onVoiceEnd={() => stopVoiceInput()}
/>

// Settings 组件
<Settings
  settings={settings}
  onChange={(newSettings) => updateSettings(newSettings)}
/>
```

---

## 7. 开发路线图

### Phase 1: MVP (核心对话)

**目标**: 实现基础的 3D 角色 + 文字对话

| 任务 | 优先级 | 复杂度 |
|------|--------|--------|
| 项目初始化 (Next.js + TypeScript) | P0 | ⭐ |
| VRM 模型加载与渲染 | P0 | ⭐⭐ |
| 基础 UI 布局 (聊天界面) | P0 | ⭐⭐ |
| LLM API 集成 (OpenAI) | P0 | ⭐⭐ |
| 角色 Prompt 设计 | P0 | ⭐⭐ |
| 表情系统基础实现 | P1 | ⭐⭐ |

**交付物**: 可以与 3D 角色进行文字对话的 Web 应用

### Phase 2: 语音交互

**目标**: 添加语音输入和输出

| 任务 | 优先级 | 复杂度 |
|------|--------|--------|
| TTS 集成 (Kokoro) | P0 | ⭐⭐⭐ |
| 口型同步实现 | P0 | ⭐⭐⭐ |
| ASR 集成 (Whisper) | P1 | ⭐⭐⭐ |
| 语音活动检测 (VAD) | P1 | ⭐⭐ |
| 打断处理 | P2 | ⭐⭐ |

**交付物**: 支持语音对话、角色说话时嘴型同步

### Phase 3: 情感与记忆

**目标**: 让角色更有"灵魂"

| 任务 | 优先级 | 复杂度 |
|------|--------|--------|
| 完整表情系统 | P0 | ⭐⭐⭐ |
| 自动眨眼/闲置动画 | P1 | ⭐⭐ |
| 记忆系统 (短期) | P1 | ⭐⭐ |
| 记忆系统 (长期/IndexedDB) | P2 | ⭐⭐⭐ |
| 情感分析增强 | P2 | ⭐⭐⭐ |

**交付物**: 角色能记住用户、有丰富的情感表达

### Phase 4: 高级功能

**目标**: 差异化特性

| 任务 | 优先级 | 复杂度 |
|------|--------|--------|
| 摄像头面部追踪 | P1 | ⭐⭐⭐⭐ |
| 用户表情镜像 | P2 | ⭐⭐⭐ |
| 多角色支持 | P2 | ⭐⭐⭐ |
| 角色编辑器 | P2 | ⭐⭐⭐⭐ |
| 声音克隆 | P3 | ⭐⭐⭐⭐ |
| 视觉理解 (看图说话) | P3 | ⭐⭐⭐⭐ |

---

## 8. 参考资源

### 8.1 开源项目

| 项目 | 说明 | 链接 |
|------|------|------|
| **Amica** | 完整的 AI 伴侣实现 | [GitHub](https://github.com/semperai/amica) |
| **TalkingHead** | 口型同步库 | [GitHub](https://github.com/met4citizen/TalkingHead) |
| **three-vrm** | VRM 支持库 | [GitHub](https://github.com/pixiv/three-vrm) |
| **Kalidokit** | 动捕数据映射 | [GitHub](https://github.com/yeemachine/kalidokit) |
| **whisper-web** | 浏览器端 Whisper | [GitHub](https://github.com/xenova/whisper-web) |
| **ChatVRM** | VRM 聊天原型 | [GitHub](https://github.com/pixiv/ChatVRM) |

### 8.2 文档资源

| 资源 | 说明 | 链接 |
|------|------|------|
| VRM 官方文档 | VRM 格式规范 | [vrm.dev](https://vrm.dev/en/) |
| Three.js 文档 | 3D 渲染引擎 | [threejs.org](https://threejs.org/docs/) |
| MediaPipe 文档 | 面部/手势追踪 | [mediapipe.dev](https://developers.google.com/mediapipe) |
| ElevenLabs API | TTS 服务 | [elevenlabs.io/docs](https://elevenlabs.io/docs) |
| Kokoro TTS | 浏览器 TTS | [HuggingFace](https://huggingface.co/hexgrad/Kokoro-82M) |

### 8.3 免费资源

| 资源 | 说明 | 链接 |
|------|------|------|
| VRoid Studio | 免费 VRM 创建工具 | [vroid.com](https://vroid.com/en/studio) |
| VRoid Hub | VRM 模型分享平台 | [hub.vroid.com](https://hub.vroid.com/) |
| Mixamo | 免费动画资源 | [mixamo.com](https://www.mixamo.com/) |
| Ready Player Me | 头像创建 | [readyplayer.me](https://readyplayer.me/) |

### 8.4 教程

| 教程 | 说明 | 链接 |
|------|------|------|
| VRM + React 教程 | 完整 VTuber 实现 | [Wawa Sensei](https://wawasensei.dev/tuto/vrm-avatar-with-threejs-react-three-fiber-and-mediapipe) |
| Lip Sync 教程 | React Three Fiber 口型同步 | [Wawa Sensei](https://wawasensei.dev/tuto/react-three-fiber-tutorial-lip-sync) |
| Whisper 浏览器部署 | 离线语音识别 | [AssemblyAI](https://www.assemblyai.com/blog/offline-speech-recognition-whisper-browser-node-js) |

---

## 附录 A: 技术选型对比

### A.1 Three.js vs Unity WebGL

| 维度 | Three.js | Unity WebGL |
|------|----------|-------------|
| 包体大小 | ~500KB | ~30MB+ |
| 加载速度 | 秒级 | 30秒+ |
| Web 集成 | 原生 | 需桥接 |
| 学习曲线 | Web 开发者友好 | 需学 C# |
| 3D 能力 | 够用 | 强大 |
| 推荐场景 | Web 优先应用 | 复杂 3D/跨平台 |

**结论**: Web AI 伴侣项目推荐 Three.js

### A.2 TTS 方案对比

| 方案 | 质量 | 延迟 | 成本 | 离线 |
|------|------|------|------|------|
| Kokoro TTS | ⭐⭐⭐⭐ | 中 | 免费 | ✅ |
| ElevenLabs | ⭐⭐⭐⭐⭐ | 低 | 付费 | ❌ |
| OpenAI TTS | ⭐⭐⭐⭐ | 低 | 付费 | ❌ |
| Web Speech | ⭐⭐ | 极低 | 免费 | 部分 |

**推荐**: Kokoro (默认) + ElevenLabs (高质量场景)

### A.3 ASR 方案对比

| 方案 | 准确率 | 延迟 | 成本 | 离线 |
|------|--------|------|------|------|
| Whisper (浏览器) | ⭐⭐⭐⭐ | 中 | 免费 | ✅ |
| Web Speech API | ⭐⭐⭐ | 低 | 免费 | 部分 |
| Deepgram | ⭐⭐⭐⭐⭐ | 极低 | 付费 | ❌ |

**推荐**: Whisper (隐私优先) / Web Speech API (快速原型)

---

## 附录 B: 项目结构参考

```
ai-virtual-companion/
├── public/
│   ├── models/          # VRM 模型文件
│   ├── animations/      # FBX 动画文件
│   └── audio/           # 音效文件
├── src/
│   ├── app/             # Next.js App Router
│   │   ├── page.tsx     # 主页面
│   │   ├── layout.tsx   # 布局
│   │   └── api/         # API Routes
│   ├── components/
│   │   ├── Avatar/      # 3D 角色组件
│   │   ├── Chat/        # 聊天界面组件
│   │   ├── Settings/    # 设置面板组件
│   │   └── UI/          # 通用 UI 组件
│   ├── lib/
│   │   ├── vrm/         # VRM 相关逻辑
│   │   ├── speech/      # 语音处理 (ASR/TTS)
│   │   ├── ai/          # AI 对话逻辑
│   │   ├── vision/      # 摄像头/MediaPipe
│   │   └── utils/       # 工具函数
│   ├── stores/          # Zustand 状态管理
│   ├── hooks/           # 自定义 Hooks
│   └── types/           # TypeScript 类型定义
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── next.config.js
```

---

## 附录 C: 环境变量配置

```env
# .env.local

# LLM API
NEXT_PUBLIC_OPENAI_API_KEY=sk-xxx
NEXT_PUBLIC_OPENAI_BASE_URL=https://api.openai.com/v1
# 或使用其他 Provider
NEXT_PUBLIC_ANTHROPIC_API_KEY=sk-ant-xxx
NEXT_PUBLIC_OLLAMA_BASE_URL=http://localhost:11434

# TTS API
NEXT_PUBLIC_ELEVENLABS_API_KEY=xxx
NEXT_PUBLIC_ELEVENLABS_VOICE_ID=xxx

# 功能开关
NEXT_PUBLIC_ENABLE_VOICE_INPUT=true
NEXT_PUBLIC_ENABLE_CAMERA=false
NEXT_PUBLIC_DEFAULT_TTS_PROVIDER=kokoro
NEXT_PUBLIC_DEFAULT_LLM_PROVIDER=openai
```

---

*文档版本: 1.0*
*最后更新: 2026-01-04*
