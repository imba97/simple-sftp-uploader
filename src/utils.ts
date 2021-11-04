import fs from 'fs'

const localPath: string[] = []
const remotePath: string[] = []

export function generateDirectoryTree(src: string, basePath: BasePath) {
  if (!fs.existsSync(src)) {
    throw new Error(`${src} 不存在`)
  }

  // 清零
  if (localPath.length > 0) localPath.splice(0, localPath.length)
  if (remotePath.length > 0) remotePath.splice(0, remotePath.length)

  doGenerateDirectoryTree(src, basePath)

  return {
    local: localPath,
    remote: remotePath
  }

}

function doGenerateDirectoryTree(src: string, basePath: BasePath) {
  const dirs = fs.readdirSync(src)
  dirs.forEach(temp => {
    const filePath = `${src}/${temp}`
    const stat = fs.statSync(filePath)
    // 是文件 记录路径
    if (stat.isFile()) {
      // 本地目录
      localPath.push(filePath.replace(/\\/g, '/'))
      // 远程目录
      remotePath.push(`${basePath.remote}${filePath.replace(basePath.local, '').replace(/\\/g, '/')}`)
    } else if (stat.isDirectory()) {
      // 文件夹 遍历
      doGenerateDirectoryTree(filePath, basePath)
    }
  })
}

interface BasePath {
  local: string
  remote: string
}
