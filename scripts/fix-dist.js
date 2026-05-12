import * as fs from 'fs'
import { join, relative, dirname, sep } from 'path'

const distDir = join(process.cwd(), 'dist')

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true })
}

fs.writeFileSync(join(distDir, 'package.json'), JSON.stringify({ type: 'commonjs' }))
console.log('Created dist/package.json with type: commonjs')

// Process main process output
const mainDistDir = join(distDir, 'main')
const mainInnerDir = join(mainDistDir, 'main')

if (fs.existsSync(mainInnerDir)) {
  // Move everything from dist/main/main to dist/main
  const entries = fs.readdirSync(mainInnerDir)
  for (const entry of entries) {
    const src = join(mainInnerDir, entry)
    const dest = join(mainDistDir, entry)
    
    if (fs.existsSync(dest)) {
      // If it's a directory, we need to handle it carefully
      if (fs.statSync(dest).isDirectory()) {
        if (entry === 'shared' || entry === 'services') {
          // For these, we want to merge or replace. Simplest is to remove existing and move.
          fs.rmSync(dest, { recursive: true, force: true })
        } else {
          // Generic handling: remove existing dest to allow rename
          fs.rmSync(dest, { recursive: true, force: true })
        }
      } else {
        fs.unlinkSync(dest)
      }
    }
    
    if (fs.existsSync(src)) {
      fs.renameSync(src, dest)
    }
  }
  
  // Clean up the now-empty inner main directory
  try {
    fs.rmSync(mainInnerDir, { recursive: true, force: true })
  } catch (e) {
    console.error(`Warning: Could not remove ${mainInnerDir}: ${e.message}`)
  }
  console.log('Moved files from dist/main/main to dist/main')
}

// Create main package.json
fs.writeFileSync(join(mainDistDir, 'package.json'), JSON.stringify({
  type: 'commonjs',
  name: '@es-cube/main'
}))

/**
 * Recursively process a directory to replace aliases
 */
function processAliases(dir, sharedRootDir) {
  if (!fs.existsSync(dir)) return

  const entries = fs.readdirSync(dir, { withFileTypes: true })
  
  for (const entry of entries) {
    const fullPath = join(dir, entry.name)
    
    if (entry.isDirectory()) {
      processAliases(fullPath, sharedRootDir)
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      let content = fs.readFileSync(fullPath, 'utf-8')
      let changed = false
      
      const fileDir = dirname(fullPath)
      let relativeToShared = relative(fileDir, sharedRootDir)
      
      // Ensure it starts with ./ or ../
      if (!relativeToShared.startsWith('.')) {
        relativeToShared = '.' + sep + relativeToShared
      }
      
      // Replace @shared/ with relative path
      const newContent = content.replace(/(require\(["'])@shared\/(.+?)(["']\))/g, (match, p1, p2, p3) => {
        changed = true
        return `${p1}${relativeToShared}/${p2}${p3}`
      }).replace(/(from ["'])@shared\/(.+?)(["'])/g, (match, p1, p2, p3) => {
        changed = true
        return `${p1}${relativeToShared}/${p2}${p3}`
      })
      
      if (changed) {
        fs.writeFileSync(fullPath, newContent)
        console.log(`Processed aliases in ${relative(distDir, fullPath)}`)
      }
    }
  }
}

// Process the flattened main process output
processAliases(mainDistDir, join(mainDistDir, 'shared'))