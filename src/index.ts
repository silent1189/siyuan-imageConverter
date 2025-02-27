import { Plugin, showMessage } from "siyuan";
import * as api from "./api";
import "@/index.scss";
import imageCompression from "browser-image-compression";

export default class PluginSample extends Plugin {
  private files: any[];
  private Hpath: string = "";
  private notebookId: string = "";
  private pageId: string = "";
  private file: File;
  private blockId: string;

  async onload() {
    this.Hpath = "";
    this.notebookId = "";
    this.pageId = "";
    this.eventBus.on("paste", this.eventBusPaste.bind(this));
    this.eventBus.on("switch-protyle", () => {
      this.Hpath = "";
      this.notebookId = "";
      this.pageId = "";
    });
  }

  async onunload() {
    console.log("onunload");
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
      this.ImageToWebp(this.files);
    }
  }

  private async getHpath(path: string): Promise<string> {
    const response = await api.getHPathByPath(this.notebookId, path);
    return response;
  }

  private async ImageToWebp(files: any[]) {
    if (this.checkImage(files[0])) {
      // 压缩图片
      const result = await this.compressImage(this.file);
      this.file = result.file;

      if (result.ratio > 0) {
        const originalSize = (this.file.size / 1024 / 1024).toFixed(2);
        const compressedSize = (result.file.size / 1024 / 1024).toFixed(2);
        showMessage(
          `图片压缩完成：
              原始大小：${originalSize}MB
              压缩大小：${compressedSize}MB
              压缩率：${result.ratio}%`,
          3000
        );
      }
      const imagePath = (await api.upload(this.Hpath, [this.file])).succMap[
        this.file.name
      ];
      const insertImage = await api.updateBlock(
        "markdown",
        `![image](${imagePath})`,
        this.blockId
      );
      return;
    }
  }

  async compressImage(file: File): Promise<{ file: File; ratio: number }> {
    const options = {
      maxSizeMB: 1, // 最大文件大小
      maxWidthOrHeight: 1920, // 最大宽度或高度
      useWebWorker: true, // 使用 Web Worker 提高性能
      fileType: "image/webp", // 输出格式为 webp
    };

    try {
      const compressedFile = await imageCompression(file, options);
      const ratio = Math.round((1 - compressedFile.size / file.size) * 100);

      // 保持原文件名，但改为.webp后缀
      const newFileName = file.name.replace(/\.[^/.]+$/, "") + ".webp";
      const finalFile = new File([compressedFile], newFileName, {
        type: "image/webp",
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

  private async pathToFile(imagePath: string) {
    const assesImage = ["jpg", "jpeg", "png", "gif", "webp"];
    if (assesImage.includes(imagePath.split(".")[1])) {
    } else {
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
      this.file = new File([buffer], fileName, { type: mimeType });
    }
  }

  private async checkImage(files: any) {
    const assesImage = ["jpg", "jpeg", "png", "gif", "webp"];
    if (typeof files === "string" && assesImage.includes(files.split(".")[1])) {
      this.pathToFile(files);
      console.log(this.file);
      return true;
    } else if (files instanceof File || files.type) {
      const type = files.type;
      if (type.indexOf("image") != -1) {
        this.file = files;
        return true;
      }
      if (assesImage.includes(files.name.split(".")[1])) {
        this.file = files;
        return true;
      }
    }
    return false;
  }
}
