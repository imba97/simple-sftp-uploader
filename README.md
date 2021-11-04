# simple-sftp-uploader

一个简单的SFTP上传器，把指定文件夹中的文件上传到服务器上。

可以单独用，也是个`webpack`插件。

# 导入

`import SftpUploader from 'simple-sftp-uploader'`

# 配置

```javascript
const sftpUploaderConfig = {
  localDir: 'dist',
  remoteDir: '/www/imba97.cn',
  connect: {
    host: '1.2.3.4',
    port: 22,
    username: 'root',
    privateKey: fs.readFileSync('C:/Users/imba97/.ssh/id_rsa')
  },
  rmExclude: [
    'favicon.ico'
  ]
}
```

# 上传

## 普通上传
```javascript
import { SftpUploader } from 'simple-sftp-uploader'
import fs from 'fs'

const sftpUploader = new SftpUploader(sftpUploaderConfig)

sftpUploader.start()
```

## Webpack

```javascript
import { SftpUploader } from 'simple-sftp-uploader'
import fs from 'fs'

// ...
{
  plugins: [
    new SftpUploader(sftpUploaderConfig)
  ]
}
```

## vue.config.js

```javascript
import { SftpUploader } from 'simple-sftp-uploader'
import fs from 'fs'
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
