import { Asset, AssetRegistry } from "playcanvas";
import { Splat } from "./splat";

interface ModelLoadRequest {
  url: string;
  contents?: ArrayBuffer;
  filename: string;
  maxAnisotropy?: number;
}

class AssetLoader {
  registry: AssetRegistry;
  defaultAnisotropy: number;
  loadAllData = true;
  constructor(registry: AssetRegistry, defaultAnisotropy?: number) {
    this.registry = registry;
    this.defaultAnisotropy = defaultAnisotropy || 1;
  }

  loadModel(loadRequest: ModelLoadRequest) {
    const registry = this.registry;

    // 进行promise封装
    return new Promise((resolve, reject) => {
      // 此处仅加载gsplat的ply文件
      const asset = new Asset(
        loadRequest.filename || loadRequest.url,
        "gsplat",
        {
          url: loadRequest.url,
          filename: loadRequest.filename,
          contents: loadRequest.contents,
        },
        {
          elementFilter: this.loadAllData ? () => true : null,
          // decompress data on load
          decompress: true,
        }
      );

      // 加载成功则解析文件
      asset.on("load", () => {
        resolve(new Splat(asset));
      });
      asset.on("error", (err: string) => {
        reject(err);
      });

      //   注册资源
      registry.add(asset);
      registry.load(asset);
    });
  }
}

export { AssetLoader };
