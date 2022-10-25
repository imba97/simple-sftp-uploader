# simple-sftp-uploader

一个简单的 SFTP 上传器，把指定文件夹中的文件上传到服务器上。

可以单独用，也是个`webpack`插件。

# 导入

```javascript
import SftpUploader from 'simple-sftp-uploader'
```

# 配置

```javascript
import fs from 'fs'

const sftpUploaderConfig = {
  localDir: 'dist',
  remoteDir: '/www/imba97.cn',
  connect: {
    host: '1.2.3.4',
    port: 22,
    username: 'root',
    privateKey: fs.readFileSync('C:/Users/imba97/.ssh/id_rsa')
  },
  rmExclude: ['favicon.ico']
}
```

# 上传

## 普通上传

```javascript
import SftpUploader from 'simple-sftp-uploader'

const sftpUploader = new SftpUploader(sftpUploaderConfig)

sftpUploader.start()
```

## Webpack

```javascript
import SftpUploader from 'simple-sftp-uploader'

// ...
{
  plugins: [new SftpUploader(sftpUploaderConfig)]
}
```

## vue.config.js

```javascript
import SftpUploader from 'simple-sftp-uploader'

// ...
{
  // ...
  chainWebpack(config) {
    // 添加插件
    config
      .plugin('SftpUploaderPlugin')
      .use(SftpUploader)
      .tap(() => [sftpUploaderConfig])
  },
  // ...
}
```

## 作为上传器使用

配置连接信息

```javascript
const uploader = new Uploader({
  connect: {
    host: '1.2.3.4',
    port: 22,
    username: 'root',
    privateKey: fs.readFileSync('C:/Users/imba97/.ssh/id_rsa')
  }
})
```

开放的接口

```typescript
// 连接，连接后才能执行以下操作
connect(): Promise<null>

// 上传文件
uploadFile(local: string, remote: string): Promise<null>

// 判断远程文件是否存在
exists(src: string): Promise<boolean>

// 删除文件夹内所有文件
deleteFiles(remote: string, exclude?: RegExp): Promise<null>

// 读取文件夹下的文件
readdir(src: string): Promise<string[]>

// 执行 shell 命令
exec(script: string): Promise<null>

// 创建文件夹
mkdir(dirPath: string): Promise<null>

// 关闭
close(): void
```
