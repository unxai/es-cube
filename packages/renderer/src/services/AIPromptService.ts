import type { ESIndexMapping } from '../../../main/services/ESConnectionManager'
import type { AIConfig } from '../store/useAppStore'

export interface AIRequest {
  naturalLanguageQuery: string
  indexMapping: ESIndexMapping | null
  indexName?: string
}

export interface AIResponse {
  success: boolean
  dsl?: string
  error?: string
}

const SYSTEM_PROMPT = `You are an Elasticsearch expert assistant. Your task is to convert natural language queries into valid Elasticsearch query DSL (JSON format).

**CRITICAL RULES:**
1. You MUST only output a valid JSON object representing the ES query DSL
2. Do NOT include any markdown code blocks (no \`\`\`, no \`json\`)
3. Do NOT include any explanations or comments - ONLY the raw JSON
4. The query must be a READ-ONLY query (search, count, etc.) - NEVER suggest destructive operations like update, delete, or delete_by_query
5. Only suggest queries that work with Elasticsearch 7.x and 8.x

**Query Types You Can Generate:**
- Match queries
- Term queries
- Range queries
- Bool queries (must, should, must_not, filter)
- Aggregations (metrics, bucket, pipeline)
- Sorting and pagination
- Query string queries

**Example Conversion:**
Natural Language: "Show me all documents where status is active and age is greater than 30"
Output:
{"query":{"bool":{"must":[{"term":{"status":"active"}},{"range":{"age":{"gt":30}}}]}},"size":100}
`

export class AIPromptService {
  private static instance: AIPromptService

  private constructor() {}

  public static getInstance(): AIPromptService {
    if (!AIPromptService.instance) {
      AIPromptService.instance = new AIPromptService()
    }
    return AIPromptService.instance
  }

  public buildPrompt(request: AIRequest): string {
    let prompt = SYSTEM_PROMPT

    if (request.indexName) {
      prompt += `\n\n**Target Index:** ${request.indexName}`
    }

    if (request.indexMapping) {
      prompt += `\n\n**Index Mapping Structure:**\n${JSON.stringify(request.indexMapping, null, 2)}`
      prompt += `\n\nUse the field names from the mapping above in your query.`
    }

    prompt += `\n\n**Natural Language Query:** "${request.naturalLanguageQuery}"`
    prompt += `\n\nOutput only the JSON query DSL:`

    return prompt
  }

  public parseAIResponse(response: string): AIResponse {
    try {
      let cleanedResponse = response.trim()

      cleanedResponse = cleanedResponse.replace(/^```json\s*/i, '')
      cleanedResponse = cleanedResponse.replace(/^```\s*/i, '')
      cleanedResponse = cleanedResponse.replace(/\s*```$/i, '')

      const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        cleanedResponse = jsonMatch[0]
      }

      const parsed = JSON.parse(cleanedResponse)

      if (typeof parsed !== 'object' || parsed === null) {
        return {
          success: false,
          error: 'Invalid response format: expected a JSON object',
        }
      }

      return {
        success: true,
        dsl: JSON.stringify(parsed, null, 2),
      }
    } catch (error) {
      return {
        success: false,
        dsl: response,
        error: `Failed to parse AI response as JSON: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }
    }
  }

  public async generateDSL(request: AIRequest, config: AIConfig): Promise<AIResponse> {
    const prompt = this.buildPrompt(request)
    const providerConfig = config.providers[config.provider]
    
    if (!providerConfig?.apiKey) {
      return { success: false, error: 'API key is missing' }
    }

    const apiKey = providerConfig.apiKey
    let baseUrl = providerConfig.baseUrl || ''
    
    try {
      let response: Response
      let aiMessage = ''

      if (config.provider === 'anthropic') {
        if (!baseUrl) baseUrl = 'https://api.anthropic.com/v1'
        response = await fetch(`${baseUrl.replace(/\/$/, '')}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerously-allow-custom-urls': 'true'
          },
          body: JSON.stringify({
            model: config.model || 'claude-3-5-sonnet-latest',
            system: SYSTEM_PROMPT,
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 2000,
            temperature: 0.1,
          }),
        })
        if (response.ok) {
          const data = await response.json()
          aiMessage = data.content?.[0]?.text
        }
      } else if (config.provider === 'gemini') {
        if (!baseUrl) baseUrl = 'https://generativelanguage.googleapis.com/v1beta'
        // Gemini uses the key in the URL
        const model = config.model || 'gemini-1.5-pro'
        response = await fetch(`${baseUrl.replace(/\/$/, '')}/models/${model}:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            system_instruction: { parts: { text: SYSTEM_PROMPT } },
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 2000 }
          }),
        })
        if (response.ok) {
          const data = await response.json()
          aiMessage = data.candidates?.[0]?.content?.parts?.[0]?.text
        }
      } else {
        // OpenAI and DeepSeek (OpenAI compatible)
        if (!baseUrl) {
          baseUrl = config.provider === 'deepseek' ? 'https://api.deepseek.com/v1' : 'https://api.openai.com/v1'
        }
        response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: config.model || (config.provider === 'deepseek' ? 'deepseek-chat' : 'gpt-4o'),
            messages: [
              { role: 'system', content: SYSTEM_PROMPT },
              { role: 'user', content: prompt },
            ],
            temperature: 0.1,
            max_tokens: 2000,
          }),
        })
        if (response.ok) {
          const data = await response.json()
          aiMessage = data.choices?.[0]?.message?.content
        }
      }

      if (!response || !response.ok) {
        const errorData = response ? await response.json().catch(() => ({})) : {}
        return {
          success: false,
          error: `AI API Error: ${response?.status} - ${errorData.error?.message || errorData.message || 'Unknown error'}`,
        }
      }

      if (!aiMessage) {
        return {
          success: false,
          error: 'No response from AI',
        }
      }

      return this.parseAIResponse(aiMessage)
    } catch (error) {
      return {
        success: false,
        error: `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }
    }
  }
}
