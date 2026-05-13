import { spawn } from 'child_process'
import { writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'

const distDir = join(process.cwd(), 'dist')

if (!existsSync(distDir)) {
  mkdirSync(distDir, { recursive: true })
}

writeFileSync(join(distDir, 'package.json'), JSON.stringify({ type: 'commonjs' }))

const commands = [
  { name: 'main', cmd: 'tsc', args: ['-p', 'packages/main/tsconfig.json', '--watch', '--preserveWatchOutput'] },
  { name: 'preload', cmd: 'tsc', args: ['-p', 'packages/preload/tsconfig.json', '--watch', '--preserveWatchOutput'] },
  { name: 'vite', cmd: 'vite', args: [] },
]

let viteUrl = 'http://localhost:5173'

commands.forEach(({ name, cmd, args }) => {
  const proc = spawn(cmd, args, { stdio: 'pipe' })
  
  proc.stdout.on('data', (data) => {
    const output = data.toString().trim()
    console.log(`[${name}] ${output}`)
    
    if (name === 'vite') {
      // Look for "Local:   http://localhost:5174/" or similar
      const match = output.match(/Local:\s+(http:\/\/localhost:\d+)\//i)
      if (match && match[1]) {
        viteUrl = match[1]
        console.log(`[dev] Detected Vite URL: ${viteUrl}`)
      }
    }
  })
  
  proc.stderr.on('data', (data) => {
    console.error(`[${name}] ${data.toString().trim()}`)
  })
  
  proc.on('close', (code) => {
    console.log(`[${name}] exited with code ${code}`)
  })
})

setTimeout(() => {
  // Run fix-dist.js to resolve aliases before starting electron
  console.log('[dev] Running fix-dist.js...')
  const fixDist = spawn('node', ['scripts/fix-dist.js'], { stdio: 'inherit' })
  
  fixDist.on('close', () => {
    // Attempt to find the Vite URL from the stored output or just use a default if not found
    // Since we are running concurrently, we might need a better way to communicate the port.
    // For now, we'll try to extract it from the logs or pass it as an environment variable if we can.
    // But since vite is already running, we can check for common ports or use a default.
    // A better way is to have vite write its port to a temp file.
    
    const electron = spawn('electron', ['.', '--no-sandbox', '--disable-gpu'], {
      env: { 
        ...process.env, 
        NODE_ENV: 'development',
        VITE_DEV_SERVER_URL: viteUrl
      }
    })
    
    electron.stdout.on('data', (data) => {
      console.log(`[electron] ${data.toString().trim()}`)
    })
    
    electron.stderr.on('data', (data) => {
      console.error(`[electron] ${data.toString().trim()}`)
    })
    
    electron.on('close', (code) => {
      console.log(`[electron] exited with code ${code}`)
      process.exit(code)
    })
  })
}, 3000)