import { Plugin, showMessage } from "siyuan";
import * as api from "./api";
import { SettingUtils } from "./libs/setting-utils";
import imageCompression from "browser-image-compression";

export default class PluginSample extends Plugin {
  private files: any[];
  private Hpath: string;
  private notebookId: string;
  private pageId: string;
  private blockId: string;
  private imageSuffix: string;
  private settingUtils: SettingUtils;
  private options = {
    1: "webp",
    2: "avif"
  };
  

  private clearValue(){
    this.Hpath = "";
    this.notebookId = "";
    this.pageId = "";
  }

  async onload() {
    console.log("加载插件");
    this.clearValue();
    this.eventBus.on("paste", this.eventBusPaste.bind(this));
    this.eventBus.on("switch-protyle", () => {
      this.clearValue();
    });
    this.showsetting();
  }

  async onunload() {
    this.clearValue();
    console.log("卸载插件");
  }

  private async showsetting(){
    const STORAGE_NAME = "config";
    this.settingUtils = new SettingUtils({
      plugin: this, name: STORAGE_NAME
  });
    this.settingUtils.addItem({
      key: "Select",
      value: 1,
      type: "select",
      title: "选择格式",
      description: "压缩后的图片将以选择的格式保存",
      options: this.options,
      action: {
        callback: async () => {
            let value = await this.settingUtils.takeAndSave("Select");
            this.imageSuffix = this.options[value];
            console.log(this.imageSuffix);
        }
    }
  });
  try {
    //加载之前的设置
    let value = await this.settingUtils.load();
    this.imageSuffix = this.options[value["Select"]]||"webp";
  } catch (e) {
    console.error(e);
  }
}

  private async eventBusPaste(event: any) {
    // 如果需异步处理请调用 preventDefault， 否则会进行默认处理
    event.preventDefault();
    // 如果使用了 preventDefault，必须调用 resolve，否则程序会卡死
    this.files = event.detail.files;
    const protyle = event.detail.protyle;
    this.blockId = protyle.breadcrumb.id;

    if (this.Hpath + this.notebookId + this.pageId === "") {
      this.notebookId = protyle.notebookId;
      this.pageId = protyle.block.rootID;
      this.Hpath =
        "assets/" +
        (await this.getNotebookConf()) +
        (await this.getHpath(protyle.path));
    }
    if (this.files.length !== 1) {
      event.detail.resolve({
        textPlain: event.detail.textPlain.trim(),
      });
    } else {
      this.ImageProcessing(this.files);
    }
  }

  private async getHpath(path: string): Promise<string> {
    const response = await api.getHPathByPath(this.notebookId, path);
    return response;
  }

  private async ImageProcessing(files: any[]) {
    var file = files[0];
    if (this.checkImage(file)) {
      if (typeof file === "string") {
        file = await this.pathToFile(file);
      }
      // 压缩图片
      const result = await this.compressImage(file);
      const newfile = result.file;
      if (result.ratio > 0) {
        const originalSize = (file.size / 1024 / 1024).toFixed(2);
        const compressedSize = (newfile.size / 1024 / 1024).toFixed(2);
        showMessage(
          `${originalSize}MB->
           ${compressedSize}MB ${result.ratio}%`,
          3000
        );
      }
      const imagePath = (await api.upload(this.Hpath, [newfile])).succMap[
        newfile.name
      ];
      let response = await api.getBlockByID(this.blockId);
      const markdownImageRegex = /\n?!\[.*?\]\(.*?\)\n?/g;
      let newMarkdown;
      if (response.markdown) {
        if (markdownImageRegex.test(response.markdown)) {
          console.log("find image in md");
          newMarkdown = response.markdown.replace(markdownImageRegex, "-d25=测试文本-d25=");
          newMarkdown = newMarkdown.replace("-d25=测试文本-d25=", `![image](${imagePath})`);
          await api.updateBlock(
            "markdown",
            newMarkdown,
            this.blockId
          );
        }else{
          console.log("not find image in md");
          newMarkdown = `${response.markdown}\n![image](${imagePath})`;
          await api.updateBlock(
            "markdown",
            newMarkdown,
            this.blockId
          );
        }
      }else{
        console.log(imagePath);
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
      const newFileName = file.name.replace(/\.[^/.]+$/, "") + "." + this.imageSuffix;
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
      return new File([buffer], fileName, { type: mimeType });
  }

  private async checkImage(files: any): Promise<boolean> {
    const assesImage = ["jpg", "jpeg", "png", "gif", "webp"];
    if (typeof files === "string" && assesImage.includes(files.split(".")[1])) {
      return true;
    } else if (files instanceof File || files.type) {
      const type = files.type;
      if (type.indexOf("image") != -1) {
        return true;
      }
      if (assesImage.includes(files.name.split(".")[1])) {
        return true;
      }
    }
    return false;
  }
}
