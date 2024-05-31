import { createGraphicsDevice } from "playcanvas";
import { Events } from "./events";
import { initMaterials } from "./material";
import { getSceneConfig } from "./scene-config";
// import { UI } from "./ui";

export async function main() {
  // 基础事件对象
  const events = new Events();

  // 获取实例
  const render = document.getElementById("render") as HTMLCanvasElement;

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
}

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
