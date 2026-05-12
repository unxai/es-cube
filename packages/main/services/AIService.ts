import { AIPromptService } from './AIPromptService'
import type { AIRequest, AIResponse } from './AIPromptService'
import { StorageService } from './StorageService'

export class AIService {
  private static instance: AIService
  private aiPromptService: AIPromptService

  private constructor() {
    this.aiPromptService = AIPromptService.getInstance()
  }

  public static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService()
    }
    return AIService.instance
  }

  public async generateDSL(request: AIRequest): Promise<AIResponse> {
    const storageService = StorageService.getInstance()
    const config = await storageService.getAIConfigWithCredentials()

    if (!config) {
      return { success: false, error: 'AI configuration is missing' }
    }

    return this.aiPromptService.generateDSL(request, config)
  }
}
