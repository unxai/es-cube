import sharp from 'sharp'
import path from 'path'

const resourcesDir = path.join(process.cwd(), 'resources')

async function generateIcons() {
  const svgPath = path.join(resourcesDir, 'logo.svg')
  
  await sharp(svgPath)
    .resize(512, 512)
    .png()
    .toFile(path.join(resourcesDir, 'icon.png'))
  
  await sharp(svgPath)
    .resize(256, 256)
    .png()
    .toFile(path.join(resourcesDir, 'icon-256.png'))
  
  console.log('Icons generated successfully in resources/')
}

generateIcons().catch(console.error)
