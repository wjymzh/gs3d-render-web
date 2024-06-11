import { createGraphicsDevice } from "playcanvas";
import { Events } from "./events";
import { initMaterials } from "./material";
import { getSceneConfig } from "./scene-config";
import { Scene } from "./scene";

export async function main(renders: HTMLCanvasElement) {
  // 获取当前url
  const url = new URL(window.location.href);
  // 基础事件对象
  const events = new Events();

  // 获取实例
  const render = renders as HTMLCanvasElement;

  // 创建图形设备
  const graphicsDevice = await createGraphicsDevice(render, {
    deviceTypes: ["webgl2"],
    antialias: false,
    depth: false,
    stencil: false,
    xrCompatible: false,
    powerPreference: "high-performance",
  });

  // 初始化材质
  initMaterials();

  const overrides = [getURLArgs()];

  // 获取当前场景初始配置
  const sceneConfig = getSceneConfig(overrides);

  // 构建场景实例
  const scene = new Scene(events, sceneConfig, render, graphicsDevice);

  // 加载模型
  await scene.load();

  // 通过url参数加载模型
  const loadParam = url.searchParams.get("load");
  const loadUrl = loadParam && decodeURIComponent(loadParam);
  if (loadUrl) {
    await scene.loadModel(loadUrl, loadUrl);
  }

  events.fire("splatSize", 2);
}

// 参数初始化
const getURLArgs = () => {
  // extract settings from command line in non-prod builds only
  const config = {};

  const apply = (key: string, value: string) => {
    let obj: any = config;
    key.split(".").forEach((k, i, a) => {
      if (i === a.length - 1) {
        obj[k] = value;
      } else {
        if (!obj.hasOwnProperty(k)) {
          obj[k] = {};
        }
        obj = obj[k];
      }
    });
  };

  const params = new URLSearchParams(window.location.search.slice(1));
  params.forEach((value: string, key: string) => {
    apply(key, value);
  });

  return config;
};
