import { safeStorage } from 'electron'

export class CryptoService {
  static encryptString(plainText: string): string {
    const encrypted = safeStorage.encryptString(plainText)
    return encrypted.toString('base64')
  }

  static decryptString(encryptedBase64: string): string {
    try {
      const buffer = Buffer.from(encryptedBase64, 'base64')
      const decrypted = safeStorage.decryptString(buffer)
      return decrypted
    } catch {
      return ''
    }
  }

  static isEncryptionAvailable(): boolean {
    return safeStorage.isEncryptionAvailable()
  }
}
