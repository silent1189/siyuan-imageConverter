# **思源笔记插件-siyuan-imageconverter**



> 作用：使用思源笔记编写文档时，通过粘贴或拖拽的方式将图片插入到页面中，会自动将插入的图片进行压缩，压缩完成后会将压缩图片插入页面中，压缩图片的文件格式为`[webp|avif]`，同时压缩的图片会根据文档树进行分类存放



## **插件优点**

- 优化思源笔记的资源图片管理方式，将插入的图片根据文档树的路径保存，避免大量资源文件堆积在assets目录下，实现根据文档树路径管理资源文件
- webp格式对与Android设备同步友好，避免手机相册中堆积图片资源文件



## **插件缺点**

- 插件目前仅实现了`[webp|jpg|jpeg|png]`四种图片格式的压缩，且压缩后的图片格式只会保存为`.webp`，同时仅支持单张图片的上传，对多张图片的插入则不会进行压缩处理
- 压缩率不稳定，压缩效果有时不算很理想



## **参考**

> [plugin-sample](https://github.com/siyuan-note/plugin-sample)
> 
> [plugin-sample-vite-svelte](https://github.com/siyuan-note/plugin-sample-vite-svelte)
> 
> [plugin-sample-vite](https://github.com/frostime/plugin-sample-vite)
> 
> [插件开发 Quick Start](https://ld246.com/article/1723732790981)
> 
> [后端API](https://github.com/siyuan-note/siyuan/blob/master/API_zh_CN.md)
> 
> [前端API](https://github.com/siyuan-note/petal/blob/main/siyuan.d.ts)
> 
> [siyuan-steve-tools](https://github.com/loonghfut/siyuan-steve-tools)

## PS

作者是思源笔记插件开发小白，通过几天时间的研究和查找资料才初步有了插件开发的能力，插件想法参考obsidian的[obsidian-image-converter](https://github.com/xRyul/obsidian-image-converter)，如果你觉得这个插件不错也请为我点star，如果有感兴趣的大佬，欢迎参与到插件开发中....

样图示例:
![image](https://github.com/user-attachments/assets/31342573-58fc-4147-bbdd-79205ba0ff85)
![image](https://github.com/user-attachments/assets/781b66db-7823-4895-a4ae-4c8cd679d2bf)

