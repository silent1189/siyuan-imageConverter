import {
  Constants,
  Dialog,
  Menu,
  Plugin,
  showMessage
} from "siyuan";
import * as api from "./api";
import "@/index.scss";
import { SettingUtils } from "./libs/setting-utils";
import imageCompression from 'browser-image-compression';
import { it } from "node:test";

const STORAGE_NAME = "config";

export default class PluginSample extends Plugin {
  private imageMap; // 新增图片映射表;
  private filesList = []; // 文件列表;
  private currentRepoPath: string; // 当前仓库路径
  private imagesavepath: any; // 新增图片保存路径属性
  private settingUtils: SettingUtils;
  private imageSuffix = "webp"; // 新增图片后缀属性
  private imageConverterStatus = false; //是否压缩图片
  private currentPageId: string; //当前页面id

  private options = {
    1: "webp",
    2: "avif",
  };

  async install() {
  }

  async onload() {
    console.log("插件加载成功");
    this.imageMap = new Set();
    //获取仓库路径
    this.GetRepoPath();
    this.eventBus.on("switch-protyle", async (data) => {
      await this.getImageSavePath(data.detail.protyle);
    });
    this.eventBus.on("click-editorcontent", async (data) => {
      await this.getImageSavePath(data.detail.protyle);
    });
    this.showsetting();
    this.addClickTopBar();
  }

  private async addClickTopBar() {
    this.addTopBar({
      icon: "iconEmoji",
      title: "imageConverter一件转换图片",
      callback: async () => {
        this.imageMap = []
        this.imageMap = await this.GetImageBlock(this.currentPageId);
        if (this.imageConverterStatus) {
          this.SwapAllImages();
        } else {
          this.swapAllImageSrc()
        }

      },
    });
  }

  public async GetImageBlock(blockid) {
    var li = [];
    const data = await api.sql(`SELECT * FROM spans where root_id='${blockid}'`);
    // console.log(data);
    data.forEach(item => {
      // console.log(item["markdown"]);
      var filePath = item["markdown"].match(/!\[.*?\]\((.*?)\)/)[1]
      var filePathList = filePath.split("/")
      //获取图片文件后缀
      var filePathList = filePathList[filePathList.length - 1].split(".")
      var fileSuffix = filePathList[1]
      var fileName = filePathList[0]
      //根据设置情况判断获取哪些图片
      if (this.imageConverterStatus) {
        if (this.addImageToMap(fileSuffix)) {
          li.push({
            "block_id": item["block_id"],
            "markdown": item["markdown"],
            "file": null,
            "old_path": filePath,
            "image_name": fileName,
            "image_suffix": this.imageSuffix
          })
        }
      } else {
        if (filePathList.length == 2) {
          if (this.addImageToMap(fileSuffix)) {
            li.push({
              "block_id": item["block_id"],
              "markdown": item["markdown"],
              "file": null,
              "old_path": filePath,
              "image_name": fileName,
              "image_suffix": fileSuffix
            })
          }
        }
      }
    })
    // console.log(li);
    return li;
  }

  public addImageToMap(suffix) {
    if (suffix !== this.imageSuffix) {
      return true
    }
    return false
  }

  public sanitizePath(str: string): string {
    return str.replace(/[\\/:*?"<>|]/g, '_') // 替换非法字符为下划线
      .replace(/\s+/g, '-')          // 空格转短横线
      .replace(/_+/g, '_')            // 合并连续下划线
      .replace(/-+/g, '-')            // 合并连续短横线
      .replace(/^[_.-]+/, '')        // 去除开头特殊符号
      .replace(/[_.-]+$/, '');        // 去除结尾特殊符号
  }

  public async swapAllImageSrc() {
    //获取图片文件补充到map中
    for (let index = 0; index < this.imageMap.length; index++) {
      const element = this.imageMap[index];
      showMessage("正在读取第" + (index + 1) + "张图片")
      var file = await this.pathToFile(this.currentRepoPath + "/" + element["markdown"].match(/!\[.*?\]\((.*?)\)/)[1])
      this.imageMap[index]["file"] = file
    }
    showMessage("图片读取完成")
    //创建目录
    await api.putFile("data/" + this.imagesavepath, true, null)
    //移动图片并更新图片块
    this.imageMap.forEach(async item => {
      const newPath = this.imagesavepath + "/" + item.image_name + "." + item.image_suffix
      var markdown = item.markdown
      markdown = markdown.replace(item.old_path, newPath)
      await api.updateBlock("markdown", markdown, item.block_id)
      await api.request(
        "/api/file/renameFile",
        {
          "path": "data/" + item.old_path,
          "newPath": "data/"+newPath
        }
      )
    })
  }

  public async SwapAllImages() {
    //获取图片文件补充到map中
    for (let index = 0; index < this.imageMap.length; index++) {
      const element = this.imageMap[index];
      showMessage("正在读取第" + (index + 1) + "张图片")
      var file = await this.pathToFile(this.currentRepoPath + "/" + element["markdown"].match(/!\[.*?\]\((.*?)\)/)[1])
      this.imageMap[index]["file"] = file
    }
    showMessage("图片读取完成")
    // console.log(this.imageMap)
    if (this.imageConverterStatus) {
      //压缩图片
      // 使用Promise.all并行处理
      const compressPromises = this.imageMap.map(async (element, index) => {
        showMessage(`正在压缩第${index + 1}张图片`);
        const tempfile = await this.compressImage(element.file);
        return { index, file: tempfile.file };
      });

      const results = await Promise.all(compressPromises);
      results.forEach(({ index, file }) => {
        this.imageMap[index].file = file;
      });
      // console.log(this.imageMap)
      showMessage("图片压缩完成")
    }
    //上传到资源
    var filesList = []
    this.imageMap.forEach(item => {
      filesList.push(item["file"])
    })
    var tmpFileList = (await api.upload(this.imagesavepath, filesList)).succMap

    //更新imageMap
    for (let index = 0; index < this.imageMap.length; index++) {
      const element = this.imageMap[index];
      var markdown = element.markdown;
      console.log(element)
      // console.log(element.old_path+"   "+element.image_name+"."+this.imageSuffix)
      markdown = markdown.replace(element.old_path, tmpFileList[element.image_name + "." + this.imageSuffix])
      this.imageMap[index].markdown = markdown
      // console.log(markdown)
    }
    // console.log(this.imageMap)
    //更新图片路径
    for (let index = 0; index < this.imageMap.length; index++) {
      const element = this.imageMap[index];
      await api.updateBlock("markdown", element.markdown, element.block_id)
      await api.removeFile("data/" + element.old_path)
    }
  }

  // public async SwapImage(filemap: any) {
  //   const [srcpath, html, file] = filemap;
  //   //console.log(this.imagesavepath)
  //   const response = await api.upload(this.imagesavepath + ".assets", [file])
  //   //console.log(response.succMap)
  // }

  async compressImage(file: File): Promise<{ file: File; ratio: number }> {

    const options = {
      maxSizeMB: 0.75, // 最大文件大小
      maxWidthOrHeight: 1920, // 最大宽度或高度
      useWebWorker: true, // 使用 Web Worker 提高性能
      fileType: "image/" + this.imageSuffix, // 输出格式为 webp
    };

    try {
      const compressedFile = await imageCompression(file, options);
      const ratio = Math.round((1 - compressedFile.size / file.size) * 100);

      // 保持原文件名，但改为.webp后缀
      const newFileName =
        file.name.replace(/\.[^/.]+$/, "") + "." + this.imageSuffix;
      const finalFile = new File([compressedFile], newFileName, {
        type: "image/" + this.imageSuffix,
      });

      return {
        file: finalFile,
        ratio: ratio,
      };

    } catch (error) {
      console.error("压缩失败:", error);
      return {
        file: file,
        ratio: 0,
      };
    }
  }

  private async pathToFile(imagePath: string): Promise<File> {
    const fs = require("fs").promises;
    const path = require("path");
    // 读取文件
    const buffer = await fs.readFile(imagePath);
    // 获取文件名
    const fileName = path.basename(imagePath);
    // 获取 MIME 类型
    const mimeType =
      {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp",
        ".avif": "image/avif"
      }[path.extname(imagePath).toLowerCase()] || "application/octet-stream";

    // 创建 File 对象
    try {
      const file = new File([buffer], fileName, { type: mimeType });
      return file;
    } catch (e) {
      showMessage(e.message);
    }
    return null;
  }

  public async GetPagePath(id) {
    const result = await api.getHPathByID(id)
    return result;
  }

  public async GetNotebookName(id) {
    const result = await api.getNotebookConf(id)
    return result.name;
  }

  public GetRepoPath() {
    this.currentRepoPath = window.siyuan.config.system.dataDir;
  }

  private async showsetting() {
    this.settingUtils = new SettingUtils({
      plugin: this,
      name: STORAGE_NAME,
    });
    this.settingUtils.addItem({
      key: "imageConverterStatus",
      value: false,
      type: "checkbox",
      title: "启用图片压缩",
      description: "启用压缩后，图片会在转换时进行压缩，关闭则不进行压缩，图片分类功能不受影响",
      action: {
        callback: async () => {
          let value = await this.settingUtils.takeAndSave(
            "imageConverterStatus"
          );
          if (value) {
            this.imageConverterStatus = true;
            showMessage("开启图片压缩功能");
          } else {
            this.imageConverterStatus = false;
            showMessage("关闭图片压缩功能");
          }
        },
      },
    });
    this.settingUtils.addItem({
      key: "saveSuffix",
      value: 1,
      type: "select",
      title: "选择格式",
      description: "压缩后的图片将以选择的格式保存",
      options: this.options,
      action: {
        callback: async () => {
          let value = await this.settingUtils.takeAndSave("saveSuffix");
          this.imageSuffix = this.options[value];
        },
      },
    });
    try {
      //加载之前的设置
      let value = await this.settingUtils.load();
      this.imageSuffix = this.options[value["Select"]] || "webp";
      this.imageConverterStatus = value["imageConverterStatus"] || false;
    } catch (e) {
      //console.error(e);
    }
  }

  //获取当前标签页id、笔记本id、保存路径
  public async getImageSavePath(protyle) {
    //获取当前页面id
    this.currentPageId = protyle.block.rootID;
    var pagepath = await this.GetPagePath(protyle.block.rootID)
    // console.log("页面路径: "+pagepath);
    //获取笔记本名字
    var notebookname = await this.GetNotebookName(protyle.notebookId);
    // console.log("笔记本名称: "+notebookname);
    //拼接保存路径
    this.imagesavepath = (notebookname + pagepath).split("/");
    for (let i = 0; i < this.imagesavepath.length; i++) {
      this.imagesavepath[i] = this.sanitizePath(this.imagesavepath[i])
    }
    //保存路径
    this.imagesavepath = "assets/" + this.imagesavepath.join("/")
  }
}