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
import test from "node:test";

const STORAGE_NAME = "config";

export default class PluginSample extends Plugin {
<<<<<<< HEAD
    private imageMap; // 新增图片映射表;
    private filesList = []; // 新增文件列表;
    private currentRepoPath: string; // 新增当前仓库路径属性
    private imagesavepath: any; // 新增图片保存路径属性
    private settingUtils: SettingUtils;
    private imageSuffix = "webp"; // 新增图片后缀属性
    private imageConverterStatus = false;

    private options = {
        1: "webp",
        2: "avif",
    };

    async install() {
    }

    async onload() {
        console.log("插件加载成功");
        this.imageMap = new Set();
        this.eventBus.on("switch-protyle", async (data) => {
            this.imageMap = [];
            await this.getImageSavePath(data.detail.protyle);
        });
        this.eventBus.on("click-editorcontent", async (data) => {
            await this.getImageSavePath(data.detail.protyle);
            console.log()
        });
        this.showsetting();
        this.addClickTopBar();
    }

    private async addClickTopBar() {
        this.addTopBar({
            icon: "iconEmoji",
            title: "imageConverter一件转换图片",
            callback: async () => {
                //console.log(this.imageMap)
                this.imageMap = await this.GetImageBlock();
                this.imageMap = Array.from(this.imageMap);
                //console.log(this.imageMap)
                // for (let i = 0; i < this.imageMap.length; i++) {
                //     const imageBlock = this.imageMap[i][1].outerHTML;

                //     // // 新增提取函数和数据处理
                //     const match = String(imageBlock).match(/<img[^>]+src="([^"]+)"/);

                //     if (match) {
                //         this.imageMap[i][0] = match[1];
                //     }
                // }
                this.GetRepoPath()
                if (this.imagesavepath === undefined) {
                    showMessage(`未检测到当前页面信息，请切换页面或重启思源再进行转换`)
                    return;
                } else if (this.imageMap.length != 0) {
                    showMessage(`检测到当前页面存在${this.imageMap.length}张图片未转换，开始转换`)
                    //console.log(this.imageMap)

                    await this.SwapAllImages();

                    showMessage(`转换完成，共${this.imageMap.length}张图片`)

                    this.imageMap = [];
                    this.filesList = [];
                } else if (this.imageMap.length == 0) {
                    showMessage(`未检测到当前页面存在未转换图片`)
                }

            },
        });
    }

    public sumImageLength() {
        var imageset = new Set();
        this.imageMap.forEach((item) => {
            imageset.add(item[0]);
        });
        return imageset.size;
    }

    public async GetImageBlock() {
        var li = new Set();
        // //解析提取图片块的dom元素
        const targetDivs = document.querySelectorAll('div[data-node-id][data-node-index][data-type]');
        targetDivs.forEach(div => {
            //检查图片
            const images = div.querySelectorAll('img[src][data-src][alt]');
            images.forEach(img => {
                //console.log(img.getAttribute("src"));
                if (this.checkimage(img.getAttribute("src"))) {
                    li.add([img.getAttribute("src"), div, null, div.getAttribute("data-node-id")])
                }
            });
        })
        return li;
    }

    public checkimage(imagename) {
        const fs = require('fs');
        const filenames = imagename.split("/")
        //console.log(filenames[filenames.length-1].split(".")[1])

        if (["jpeg", "jpg", "png"].includes(filenames[filenames.length - 1].split(".")[1]) &&
            fs.existsSync(this.currentRepoPath + "/" + imagename)) {
            console.log(this.imageConverterStatus);
            switch (filenames.length) {
                case 2:
                    return true
                default:
                    if (this.imageConverterStatus) {
                        return true
                    } else {
                        return false
                    }
            }
        } else {
            return false;
        }
    }

    public sanitizePath(str: string): string {
        return str.replace(/[\\/:*?"<>|]/g, '_') // 替换非法字符为下划线
            .replace(/\s+/g, '-')          // 空格转短横线
            .replace(/_+/g, '_')            // 合并连续下划线
            .replace(/-+/g, '-')            // 合并连续短横线
            .replace(/^[_.-]+/, '')        // 去除开头特殊符号
            .replace(/[_.-]+$/, '');        // 去除结尾特殊符号
    }

    public async SwapAllImages() {
        //console.log(this.imageMap)
        for (let i = 0; i < this.imageMap.length; i++) {
            const file = await this.CompressImage(this.imageMap[i][0]);
            this.filesList.push(file)
            this.imageMap[i][2] = file;
        }
        //console.log(this.imagesavepath + ".assets")
        const response = await api.upload(this.imagesavepath + ".assets", this.filesList)
        //console.log(response.succMap)
        // const responseArray = Object.entries(response.succMap).map(([key, value]) => ({ key, value }));
        // console.log(responseArray)
        // //规范数组
        for (let i = 0; i < this.imageMap.length; i++) {
            //console.log(this.getnewimagename(this.imageMap[i][0]));
            this.imageMap[i][2] = response.succMap[this.getnewimagename(this.imageMap[i][0])];
            //console.log(responseArray[i]["key"] +"---"+this.imageMap[i][0])
            //this.imageMap[i][2] = responseArray[i]["value"]
        }
        //console.log(this.imageMap)
        var ID;
        var DOM: Document;
        var resultPool = new Set();
        //console.log(this.imageMap)
        // //  
        for (let i = 0; i < this.imageMap.length; i++) {
            const [srcpath, dom, dstpath, id] = this.imageMap[i];
            if (ID != id) {
                DOM = dom
            }
            var images = DOM?.querySelectorAll('img[src][data-src][alt]');
            images.forEach(img => {
                if (!resultPool.has(img.getAttribute("src")) &&
                    srcpath == img.getAttribute("src")) {
                    img.setAttribute("src", dstpath)
                    img.setAttribute("data-src", dstpath)
                    //console.log(img)
                    resultPool.add(img.getAttribute("src"))
                }
            });
            // await api.updateBlock("dom",DOM,ID)
            // break;
        }
        // for (let i = 0; i < this.imageMap.length; i++) {
        //     // const key = this.getnewimagename(this.imageMap[i][0])
        //     // this.imageMap[i][2] = response.succMap[key]
        //     if (this.imageMap[i][3] != id) {
        //         //this.SwapImageDom(this.imageMap[i])
        //         dom = this.imageMap[i][1]
        //     }
        //     var images = dom.querySelectorAll('img[src][data-src][alt]');
        //     var index = 0;

        //     for (let i = 0; i < this.imageMap.length; i++) {
        //         var img = images[i]
        //         //console.log(img.getAttribute("src"))
        //         if (!resultPool.has(img.getAttribute("src")) && 
        //             this.imageMap[i][0] === img.getAttribute("src")) {
        //             //console.log(img)

        //             img.setAttribute("src", this.imageMap[i][2])
        //             img.setAttribute("data-src", this.imageMap[i][2])
        //             //console.log(this.imageMap[i][3])
        //             resultPool.add(img.getAttribute("src"))
        //         }
        //     }
        // images.forEach(img => {
        //     if (!resultPool.has(img.getAttribute("src"))) {
        //         // img.setAttribute("src", response.succMap[key])
        //         // img.setAttribute("data-src", response.succMap[key])
        //         console.log(this.imageMap[index][3])
        //         resultPool.add(img.getAttribute("src"))
        //     }
        //     index++
        // });

        //await this.SwapImageDom(this.imageMap[i])
        //}
        // var dom ;
        // var id ;
        // for (let i = 0; i < this.imageMap.length; i++) {

        // }
    }

    public async SwapImage(filemap: any) {
        const [srcpath, html, file] = filemap;
        //console.log(this.imagesavepath)
        const response = await api.upload(this.imagesavepath + ".assets", [file])
        //console.log(response.succMap)
    }

    public SwapImageDom(map) {//: Promise<IResdoOperations[]> {
        const [srcpath, dom, newpath, id] = map;
        const imgElements = dom.querySelectorAll('img[src][data-src]');

        imgElements.forEach(img => {
            img.src = newpath;
            img.dataset.src = newpath;
        });
    }

    public getnewimagename(srcimagename) {
        let temp = srcimagename.split("/")
        temp = temp[temp.length - 1]
        if (this.imageConverterStatus) {
            temp = temp.split(".")[0]
            return temp + "." + this.imageSuffix;
        } else {
            return temp;
        }
    }

    public async CompressImage(imagepath: string) {
        // 新增图片压缩函数
        // 新增图片打开逻辑
        const path = require('path');

        try {
            // 构建绝对路径
            const absolutePath = path.join(
                this.currentRepoPath,
                imagepath
            );
            //console.log('绝对路径:', absolutePath);
            let file = await this.pathToFile(absolutePath);
            // 压缩图片
            //console.log(this.imageConverterStatus)
            if (this.imageConverterStatus) {
                const response = await this.compressImage(file);

                if (response.ratio > 0) {
                    const originalSize = (file.size / 1024 / 1024).toFixed(2);
                    const compressedSize = (response.file.size / 1024 / 1024).toFixed(2);
                    showMessage(
                        `${originalSize}MB->
                   ${compressedSize}MB ${response.ratio}%`,
                        3000
                    );
                }
                return response.file;
            } else {
                const compressedFile = await imageCompression(file, {});
                const finalFile = new File([compressedFile], file.name, {
                    type: file.type,
                    lastModified: Date.now()
                });
                return finalFile;
            }
            //console.log('图片 Buffer 读取成功: ', typeof imageBuffer);
        } catch (error) {
            console.error('打开图片失败:', error);
        }
    }

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
            description: "开启图片压缩功能,分类存放时插件必须保留功能,不会受到影响",
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

    public async getImageSavePath(protyle) {
        this.GetRepoPath();
        var pagepath = await this.GetPagePath(protyle.block.rootID)
        var notebookname = await this.GetNotebookName(protyle.notebookId)
        this.imagesavepath = (notebookname + pagepath).split("/");
        for (let i = 0; i < this.imagesavepath.length; i++) {
            this.imagesavepath[i] = this.sanitizePath(this.imagesavepath[i])
        }
        this.imagesavepath = "assets/" + this.imagesavepath.join("/")
    }
=======
  private file: File;
  private Hpath: string;
  private notebookId: string;
  private pageId: string;
  private blockId: string;
  private imageSuffix: string;
  private settingUtils: SettingUtils;
  private options = {
    1: "webp",
    2: "avif",
  };
  private imageIdMap;
  private repoPath: string;

  private clearValue() {
    this.Hpath = "1";
    this.notebookId = "1";
    this.pageId = "1";
  }

  async onload() {
    console.log("加载插件");
    this.repoPath = window.siyuan.config.system.dataDir;
    this.clearValue();
    this.eventBus.on("paste", this.eventBusPaste.bind(this));
    this.eventBus.on("switch-protyle", async (e) => {
      this.clearValue();
      this.imageIdMap = [];
      this.pageId = e.detail.protyle.block.rootID;
      const path = e.detail.protyle.path;
      this.notebookId = e.detail.protyle.notebookId;
      this.Hpath =
        "assets/" +
        (await this.getNotebookConf()) +
        (await this.getHpath(path));
      this.getImageIdMap(path);
    });
    this.addClickTopBar();
    this.showsetting();
  }

  async onunload() {
    this.clearValue();
    console.log("卸载插件");
  }

  async uninstall() {
    this.clearValue();
    console.log("删除插件");
  }

  async getImageIdMap(path: string) {
    const Childrens = (await api.getFile("data/" + this.notebookId + path));
      const result = [];
      this.findImageParentNodes(Childrens,result);
      for(let i = 0; i < result.length; i++) {
        const Children = result[i];
        const id = Children.id;
        if(Children.children.length === 3) {
          const result = this.findImagePath(Children.children[1].Children)
          if(result !== "notFind"){
          //const result = this.findImagePath(Children.children[1].Children);
          this.imageIdMap.push([id, [
            Children.children[0].Data,
            result,
            Children.children[2].Data,
          ]]);}else{
            continue;
          }
        }else if(Children.children.length === 1){
          const result = this.findImagePath(Children.children[0].Children)
          if(result !== "notFind"){
          this.imageIdMap.push([id, [
            "",
            result,
            "",
          ]]);}else{
            continue;
          }
        }
      }
      //console.log(this.imageIdMap);
  }

  private findImagePath(imagePath:string): string {
    for(let i = 0; i < imagePath.length; i++) {
      const list = imagePath[i]?.Data;
      if(typeof list === "string"&&
        ["jpg", "jpeg", "png"].includes(list.split(".").pop())) {
        return list;
      }
    }
    return "notFind";
  }

private findImageParentNodes(node: any, result: any[] = []) {
  // 如果当前节点是段落节点，检查其是否包含图片
  if (node.Type === "NodeParagraph") {
      const hasImage = node.Children?.some(child => child.Type === "NodeImage");
      if (hasImage) {
          result.push({
              id: node.ID,
              properties: node.Properties,
              children: node.Children
          });
      }
  }
  // 递归检查子节点
  if (node.Children && Array.isArray(node.Children)) {
      for (const child of node.Children) {
          this.findImageParentNodes(child, result);
      }
  }
  return result;
}

  private async addClickTopBar() {
    this.addTopBar({
      icon: "iconEmoji",
      title: "imageConverter一件转换图片",
      callback: async () => {
        if (this.imageIdMap.length === 0) {
          showMessage("当前页面中没有未转换图片");
        } else {
          showMessage(
            `imageConverter检测到页面中存在${this.imageIdMap.length}张未转换图片, 开始批量转换, 转换完成前请勿刷新或切换页面`
          );
          for (let i = 0; i < this.imageIdMap.length; i++) {
            const [id, imageChildrensList] = this.imageIdMap[i];
            const image = (
              await this.compressImage(
                await this.pathToFile(
                  this.repoPath + "/" + imageChildrensList[1]
                )
              )
            ).file;
            this.imageIdMap[i] = [
              id,
              [imageChildrensList[0], image, imageChildrensList[2]],
            ];
          }
          this.ImagesProcessing();
          showMessage("转换完成");
        }
      },
    });
  }

  private async showsetting() {
    this.settingUtils = new SettingUtils({
      plugin: this,
      name: STORAGE_NAME,
    });
    this.settingUtils.addItem({
      key: "imageConverterStatus",
      value: true,
      type: "checkbox",
      title: "启用图片压缩",
      description: "开启图片压缩功能,分类存放时插件必须保留功能,不会受到影响",
      action: {
        callback: async () => {
          let value = await this.settingUtils.takeAndSave("imageConverterStatus");
          if (value) {
            showMessage("开启图片压缩功能");
          } else {
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
    } catch (e) {
      console.error(e);
    }
  }

  private async eventBusPaste(event: any) {
    // 如果需异步处理请调用 preventDefault， 否则会进行默认处理
    event.preventDefault();
    // 如果使用了 preventDefault，必须调用 resolve，否则程序会卡死
    this.file = event.detail.files[0];
    const protyle = event.detail.protyle;
    this.blockId = protyle.breadcrumb.id;
    this.notebookId = protyle.notebookId;
    const path = protyle.path;
    if (event.detail.files.length === 1) {
      if (this.Hpath = "1") {
        this.Hpath =
        "assets/" +
        (await this.getNotebookConf()) +
        (await this.getHpath(path));
      }
      this.ImageProcessing(this.file);
    } else {
      event.detail.resolve({
        textPlain: event.detail.textPlain.trim(),
      });
    }
  }

  private async getHpath(path: string): Promise<string> {
    const pathList = path.split("/");
    let result = "";
    for (let i = 1; i < pathList.length; i++) {
      const id = pathList[i].replace(/\.sy$/g, ""); // 使用正则去除.sy后缀
      const pageName = await this.getPageName(id);
      result = result + "/" + pageName.replace(/[ |\?|<|>|:|\\|*|\|]/g,"_");
    }
    return result;
  }

  private async ImagesProcessing() {
    const images: File[] = [];
    this.imageIdMap.forEach(async (item) => {
      const [id, imageChildrensList] = item;
      images.push(imageChildrensList[1]);
    });
    const response = (await api.upload(this.Hpath, images)).succMap;
    for (let i = 0; i < this.imageIdMap.length; i++) {
      this.imageIdMap[i][1][1] = response[images[i].name];
      this.imageIdMap[
        i
      ][1] = `${this.imageIdMap[i][1][0]}![image](${this.imageIdMap[i][1][1]})\n${this.imageIdMap[i][1][2]}`;
    }
    this.imageIdMap.forEach(async (item) => {
      const [id, imageChildrensList] = item;
      await api.updateBlock("markdown", imageChildrensList, id);
    });
  }

  private async ImageProcessing(file: File) {
    if (this.checkImage(file)) {
      if (typeof file === "string") {
        file = await this.pathToFile(file);
      }
      let resultFile = file;
      if(this.settingUtils.get("imageConverterStatus")){
      // 压缩图片
      const response = (await this.compressImage(file));
      resultFile = response.file;
      if (response.ratio > 0) {
        const originalSize = (file.size / 1024 / 1024).toFixed(2);
        const compressedSize = (resultFile.size / 1024 / 1024).toFixed(2);
        showMessage(
          `${originalSize}MB->
           ${compressedSize}MB ${response.ratio}%`,
          3000
        );
      }}
      const imagePath = (await api.upload(this.Hpath, [resultFile])).succMap[
        resultFile.name
      ];
      let response = await api.getBlockByID(this.blockId);
      const markdownImageRegex = /!\[.*?\]\(.*?\)/g;
      //const markdownImageRegex = /\n?!\[.*?\]\(.*?\)\n?/g;
      //存储修改后的markdown内容
      let newMarkdown;
      if (response.markdown) {
        if (markdownImageRegex.test(response.markdown)) {
          newMarkdown = response.markdown.replace(
            markdownImageRegex,
            "-d25=测试文本-d25="
          );
          newMarkdown = newMarkdown.replace(
            "-d25=测试文本-d25=",
            `![image](${imagePath})`
          );
          await api.updateBlock("markdown", newMarkdown, this.blockId);
        } else {
          newMarkdown = `${response.markdown}![image](${imagePath})`;
          await api.updateBlock("markdown", newMarkdown, this.blockId);
        }
      } else {
        await api.updateBlock(
          "markdown",
          `![image](${imagePath})`,
          this.blockId
        );
      }
      return;
    }
  }

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

  private async getNotebookConf(): Promise<string> {
    const conf = await api.getNotebookConf(this.notebookId);
    return conf?.name;
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
      }[path.extname(imagePath).toLowerCase()] || "application/octet-stream";

    // 创建 File 对象
    try{
      const file = new File([buffer], fileName, { type: mimeType });
      return file;
    }catch(e){
      showMessage(e.message);
    }
    return null;
  }

  private async checkImage(files: any): Promise<boolean> {
    const assesImage = ["jpg", "jpeg", "png"];
    if (typeof files === "string" && assesImage.includes(files.split(".").pop())) {
      return true;
    } else if (files instanceof File || files.type) {
      const type = files.type;
      if (type.indexOf("image") != -1) {
        return true;
      }
      if (assesImage.includes(files.name.split(".").pop())) {
        return true;
      }
    }
    return false;
  }
>>>>>>> 8156b2be9ffbf15472e7f2ef7d1dd1dba0b17be4
}
