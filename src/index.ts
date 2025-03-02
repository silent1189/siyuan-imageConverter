import { Plugin, showMessage } from "siyuan";
import * as api from "./api";
import { SettingUtils } from "./libs/setting-utils";
import imageCompression from "browser-image-compression";

export default class PluginSample extends Plugin {
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
    this.Hpath = "";
    this.notebookId = "";
    this.pageId = "";
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

  async getImageIdMap(path: string) {
    const Childrens = (await api.getFile("data/" + this.notebookId + path))
      .Children;
    for (let i = 0; i < Childrens.length; i++) {
      if (
        Childrens[i].Children &&
        Childrens[i].Children.length === 3 &&
        !["webp", "avif"].includes(
          Childrens[i].Children[1].Children[5].Data.split(".").pop()
        )
      ) {
        this.imageIdMap.push([
          Childrens[i].ID,
          [
            Childrens[i].Children[0].Data,
            Childrens[i].Children[1].Children[5].Data,
            Childrens[i].Children[2].Data,
          ],
        ]);
      }
    }
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
    const STORAGE_NAME = "config";
    this.settingUtils = new SettingUtils({
      plugin: this,
      name: STORAGE_NAME,
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
    if (event.detail.files.length !== 1) {
      event.detail.resolve({
        textPlain: event.detail.textPlain.trim(),
      });
    } else {
      this.ImageProcessing(this.file);
    }
  }

  private async getHpath(path: string): Promise<string> {
    const response = await api.getHPathByPath(this.notebookId, path);
    return response;
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
      const markdownImageRegex = /!\[.*?\]\(.*?\)/g;
      //const markdownImageRegex = /\n?!\[.*?\]\(.*?\)\n?/g;
      //存储修改后的markdown内容
      let newMarkdown;
      console.log(newfile);
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
