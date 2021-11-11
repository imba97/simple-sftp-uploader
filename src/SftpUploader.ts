/**
 * sftp 上传
 * 可以指定一个目录，将里面的文件上传到远程服务器的指定目录中
 */

import { Client as SSHClient, SFTPWrapper, ConnectConfig, ClientErrorExtensions } from 'ssh2'
import { generateDirectoryTree } from './utils'

import path from 'path'

export default class SftpUploadPlugin {

  private _client!: SSHClient
  private _sftp: SFTPWrapper

  private _local: string
  private _remote: string
  private _rmExclude: string[]
  private _connect: ConnectConfig

  /**
   * 已上传数量
   */
  private _uploadFinshed: number = 0

  private _directoryTree: {
    local: string[]
    remote: string[]
  } = {
      local: [],
      remote: []
    }

  /**
   * 远程文件夹中的文件列表
   */
  private _remoteDirFiles: string[]

  private _consoleMark = {
    start: '┌',
    info: '├',
    end: '└'
  }

  constructor(options: SftpUploaderOptions) {

    // 配置
    this._local = options.localDir
    this._remote = options.remoteDir
    this._rmExclude = options.rmExclude || []
    this._connect = options.connect

  }

  // Webpack 钩子
  apply(compiler: any) {
    // 打包完成后
    compiler.hooks.done.tapAsync('SftpUploadPlugin', async (compilation: any, callback: () => any) => {
      callback()
      // production 才会触发插件
      if (compiler.options.mode === 'production') {
        console.log(`[SftpUploadPlugin]: Upload to remote ${this._remote}`)
        await this.start()
      }
    })
  }

  /**
   * 执行上传
   */
  public async start() {

    // 目录树
    this._directoryTree = generateDirectoryTree(this._local, this._remote)

    await this.connect()

    // 【清空文件夹】
    if (await this.exists(this._remote)) {
      console.log(`${this._consoleMark.start} 开始清空文件夹内容`)
      // 获取文件夹内容
      this._remoteDirFiles = await this.readdir(this._remote)
      // 清理
      await this.cleardir()
      console.log(`${this._consoleMark.end} 清空完成`)
    }

    // 【上传】
    console.log(`${this._consoleMark.start} 开始上传`)
    await this.upload()

    this.close()
  }

  /**
   * 上传文件
   * @param _local 本地路径
   * @param _remote 远程路径
   * @return
   */
  public async uploadFile(_local: string, _remote: string) {
    return await this.doUpload(_local, _remote)
  }

  /**
   * 检查文件、文件夹是否存在
   * @param {string} src
   * @return {Promise<boolean>} 是否存在
   */
  public exists(src: string) {
    return new Promise((resolve) => {
      this._sftp.exists(src, isExists => {
        resolve(isExists)
      })
    })
  }

  /**
   * 清空远程目录下文件
   * @param i 当前清空下标
   * @return
   */
  public async cleardir(i = 0): Promise<null> {
    if (this._remoteDirFiles.length === 0) return Promise.resolve(null)

    const filename = this._remoteDirFiles[i]
    // 不是排除文件
    if (this._rmExclude.indexOf(filename) === -1) {
      console.log(`${this._consoleMark.info} 删除 ${filename}`)
      await this.exec(`rm -rf ${this._remote}/${filename}`)
    } else {
      console.log(`${this._consoleMark.info} 排除 ${filename}`)
    }

    // 遍历完后返回
    if (++i === this._remoteDirFiles.length) {
      return Promise.resolve(null)
    } else {
      return this.cleardir(i)
    }
  }

  /**
   * 执行 shell 命令
   * @param script 命令
   * @return
   */
  public exec(script: string): Promise<null> {
    return new Promise((resolve) => {
      this._client.exec(script, (_err, stream) => {
        stream
          .on('close', () => {
            resolve(null)
          })
          .on(
            'data',
            (data: any) => {
              stream.end()
              if (data) resolve(null)
            })
          .stderr.on(
            'data',
            (data) => {
              stream.end()
              if (data) resolve(null)
            })
      })
    })
  }

  /**
   * 读取远程文件夹下文件
   * @param src 远程路径
   */
  public readdir(src: string): Promise<string[]> {
    return new Promise((resolve) => {
      this._sftp.readdir(src, (_readdirErr, handle) => {
        resolve(handle.map(item => item.filename))
      })
    })
  }

  /**
   * 创建文件夹
   * @param dirPath 文件夹路径
   * @param index 嵌套文件夹的 当前 index
   * @return 
   */
  public async mkdir(dirPath: string | string[], index = 0) {
    return new Promise((resolve) => {
      (async () => {
        if (typeof dirPath === 'string' && await this.exists(dirPath)) {
          resolve(null)
          return
        }

        const dirs = !Array.isArray(dirPath)
          ? path.dirname(dirPath).replace(/^\//, '').split('/')
          : dirPath

        const fullPath = `${dirs
          .map((p, _index) => (_index <= index ? `/${p}` : ''))
          .join('')}`

        if (!await this.exists(fullPath)) {
          this._sftp.mkdir(
            fullPath,
            {
              mode: '0755'
            },
            () => {
              // 下一级目录
              if (index < dirs.length - 1) {
                resolve(this.mkdir(dirs, index + 1))
              } else {
                resolve(null)
              }
            }
          )
        } else {
          // 下一级目录
          if (index < dirs.length - 1) {
            resolve(this.mkdir(dirs, index + 1))
          } else {
            resolve(null)
          }
        }
      })()
    })
  }

  /**
   * 检查连接状态
   */
  private checkConnect(): boolean {
    return !this._client
  }

  /**
   * 连接
   */
  private connect(): Promise<null> {
    return new Promise((resolve, reject) => {
      // 初始化 SSH 客户端
      this._client = new SSHClient()
      this._client
        .on('ready', () => {

          this._client.sftp((_err, _sftp) => {
            this._sftp = _sftp
            resolve(null)
          })
        })
        .on('error', (err) => {
          reject(err)
        })
        .connect(this._connect)
    })
  }

  private close() {
    this._sftp.end()
    this._client.end()
  }

  /**
   * 上传文件
   * @param i 当前遍历下标
   */
  private async upload(i = 0): Promise<any> {
    const path = this._directoryTree.remote[i]
    await this.mkdir(path)
    await this.doUpload(this._directoryTree.local[i], this._directoryTree.remote[i])
    if (++this._uploadFinshed === this._directoryTree.remote.length) {
      console.log(`${this._consoleMark.end} 上传完成`)
      this._client.end()
    } else {
      return this.upload(++i)
    }
  }

  /**
   * 上传文件
   * @param _local 本地路径
   * @param _remote 远程路径
   * @return
   */
  private async doUpload(_local: string, _remote: string) {
    return new Promise((resolve) => {
      this._sftp.fastPut(_local, _remote, (err) => {
        if (err) {
          console.log(`${this._consoleMark.info} 上传失败 ${_remote}`)
        } else {
          console.log(`${this._consoleMark.info} 上传 ${_remote}`)
        }
        resolve(null)
      })
    })
  }

}

interface SftpUploaderOptions {
  /**
  * 本地目录
  */
  localDir: string

  /**
  * 远程目录
  */
  remoteDir: string

  /**
   * 连接设置
   */
  connect: ConnectConfig

  /**
  * 删除远程文件时要忽略的目录
  */
  rmExclude?: string[]
}
