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

const STORAGE_NAME = "config";

export default class PluginSample extends Plugin {
    private imageMap = []; // 新增图片映射表;
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
        const dialog = new Dialog({
            title: "!!!使用imageConverter前请切换文档或重启思源!!!",
            content: `刚加载时插件无法获取到当前页面的信息，也就会导致转换图片时会出现路径错误，切换文档后才能正常使用`,
            // 其他配置...
        });
    }

    async onload() {
        console.log("插件加载成功");
        this.eventBus.on("switch-protyle", async (data) => {
            this.imageMap = [];
            let pagepath = await this.GetPagePath(data.detail.protyle.block.rootID)
            let notebookname = await this.GetNotebookName(data.detail.protyle.notebookId)
            this.imagesavepath = (notebookname + pagepath).split("/");
            for (let i = 0; i < this.imagesavepath.length; i++) {
                this.imagesavepath[i] = this.sanitizePath(this.imagesavepath[i])
            }
            this.imagesavepath = "assets/" + this.imagesavepath.join("/")
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
                this.GetImageBlock();
                for (let i = 0; i < this.imageMap.length; i++) {
                    const imageBlock = this.imageMap[i][1].outerHTML;

                    // // 新增提取函数和数据处理
                    const match = String(imageBlock).match(/<img[^>]+src="([^"]+)"/);

                    if (match) {
                        this.imageMap[i][0] = match[1];
                        //this.imageMap[i][1] = imageBlock;
                        this.imageMap[i][2] = null;
                    }
                }
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
                }else if(this.imageMap.length == 0){
                    showMessage(`未检测到当前页面存在未转换图片`)
                }

            },
        });
    }

    public async GetImageBlock() {
        // //解析提取图片块的dom元素
        const targetDivs = document.querySelectorAll('div[data-node-id][data-node-index][data-type]');
        targetDivs.forEach(div => {
            const images = div.querySelectorAll('img[src][data-src][alt]');
            images.forEach(img => {
                if (this.checkimage(img.getAttribute("src"))) {
                    this.imageMap.push(["", div, null, div.getAttribute("data-node-id")])
                }
            });
        })
    }

    public checkimage(imagename) {
        const filenames = imagename.split("/")
        if (filenames.length == 2 && ["jpeg", "jpg", "png"].includes(filenames[1].split(".")[1])) {
            //console.log(imagename)
            return true;
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
        for (let i = 0; i < this.imageMap.length; i++) {
            const file = await this.CompressImage(this.imageMap[i][0]);
            this.filesList.push(file)
            this.imageMap[i][2] = file;
        }
        //console.log(this.imagesavepath + ".assets")
        const response = await api.upload(this.imagesavepath + ".assets", this.filesList)
        //console.log(response.succMap)
        for (let i = 0; i < this.imageMap.length; i++) {
            const key = this.getnewimagename(this.imageMap[i][0])
            this.imageMap[i][2] = response.succMap[key]
            this.SwapImageDom(this.imageMap[i])
        }
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
        let temp = srcimagename.split("/")[1]
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
}
