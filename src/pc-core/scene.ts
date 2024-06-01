import {
  BoundingBox,
  Entity,
  GraphicsDevice,
  Layer,
  LAYERID_DEPTH,
  Mouse,
  SORTMODE_NONE,
  TouchDevice,
  Color,
} from "playcanvas";
import { Element, ElementType, ElementTypeList } from "./element";
import { Events } from "./events";
import { SceneConfig } from "./scene-config";
import { PCApp } from "./pc-app";
import { AssetLoader } from "./asset-loader";
import { Splat } from "./splat";
import { Camera } from "./camera";
import { SceneState } from "./scene-state";
import { Grid } from "./grid";

const bound = new BoundingBox();

class Scene {
  events: Events;
  config: SceneConfig;
  canvas: HTMLCanvasElement;
  app: PCApp;
  forceRender = false;
  backgroundLayer: Layer;
  shadowLayer: Layer;
  debugLayer: Layer;
  gizmoLayer: Layer;
  assetLoader: AssetLoader;
  contentRoot: Entity;
  cameraRoot: Entity;
  elements: Element[] = [];
  bound = new BoundingBox();
  camera: Camera;
  sceneState = [new SceneState(), new SceneState()];
  canvasResize: { width: number; height: number } | null = null;
  targetSize = {
    width: 0,
    height: 0,
  };
  grid: Grid;

  constructor(
    events: Events,
    config: SceneConfig,
    canvas: HTMLCanvasElement,
    graphicsDevice: GraphicsDevice
  ) {
    this.events = events;
    this.config = config;
    this.canvas = canvas;

    // 配置一个playcanvas 应用程序，超级简介的配置
    this.app = new PCApp(canvas, {
      mouse: new Mouse(canvas),
      touch: new TouchDevice(canvas),
      graphicsDevice: graphicsDevice,
    });

    // 手动控制场景渲染
    // this.app.autoRender = false;
    this.app._allowResize = false;
    this.app.scene.clusteredLightingEnabled = false;

    // hack: disable lightmapper first bake until we expose option for this
    // @ts-ignore
    this.app.off("prerender", this.app._firstBake, this.app);

    // @ts-ignore
    this.app.loader.getHandler("texture").imgParser.crossOrigin = "anonymous";

    // 获取当前设备的像素比，让渲染设备进行时适配
    this.app.graphicsDevice.maxPixelRatio = window.devicePixelRatio;

    // 配置深度图层
    const depthLayer = this.app.scene.layers.getLayerById(
      LAYERID_DEPTH
    ) as Layer;
    this.app.scene.layers.remove(depthLayer);
    this.app.scene.layers.insertOpaque(depthLayer, 2);

    // 注册渲染实例毁回调函数
    // register application callbacks
    this.app.on("update", (deltaTime: number) => this.onUpdate(deltaTime));
    // this.app.on("prerender", () => this.onPreRender());
    // this.app.on("postrender", () => this.onPostRender());

    // force render on device restored
    this.app.graphicsDevice.on("devicerestored", () => {
      this.forceRender = true;
    });

    // 背景图层
    this.backgroundLayer = new Layer({
      enabled: true,
      name: "Background Layer",
      opaqueSortMode: SORTMODE_NONE,
      transparentSortMode: SORTMODE_NONE,
    });

    // 阴影网状背景
    this.shadowLayer = new Layer({
      name: "Shadow Layer",
    });

    // 下面俩不知道干嘛的
    this.debugLayer = new Layer({
      enabled: true,
      name: "Debug Layer",
      opaqueSortMode: SORTMODE_NONE,
      transparentSortMode: SORTMODE_NONE,
    });

    // gizmo layer
    this.gizmoLayer = new Layer({
      name: "Gizmo",
      clearDepthBuffer: true,
      opaqueSortMode: SORTMODE_NONE,
      transparentSortMode: SORTMODE_NONE,
    });

    // 配置图层，插入图层，确定图层层级
    const layers = this.app.scene.layers;
    const worldLayer = layers.getLayerByName("World") as Layer;
    const idx = layers.getOpaqueIndex(worldLayer);
    layers.insert(this.backgroundLayer, idx);
    layers.insert(this.shadowLayer, idx + 1);
    layers.insert(this.debugLayer, idx + 1);
    layers.push(this.gizmoLayer);

    // 创建场景资源加载器
    this.assetLoader = new AssetLoader(
      this.app.assets,
      this.app.graphicsDevice.maxAnisotropy
    );

    // 创建根实体
    this.contentRoot = new Entity("contentRoot");
    this.app.root.addChild(this.contentRoot);

    // 创建相机实体
    this.cameraRoot = new Entity("cameraRoot");
    this.app.root.addChild(this.cameraRoot);

    // create elements
    this.camera = new Camera();
    this.add(this.camera);

    this.grid = new Grid();
    this.add(this.grid);

    console.log(this.app);
  }

  // 加载入口
  async load() {
    const config = this.config;

    // load scene assets
    const promises: Promise<any>[] = [];

    // load model
    if (config.model.url) {
      promises.push(
        this.assetLoader.loadModel({
          url: config.model.url,
          filename: config.model.filename,
        })
      );
    }

    const elements = await Promise.all(promises);

    // add them to the scene
    elements.forEach((e) => this.add(e));

    this.updateBound();

    // start the app
    this.app.start();
  }

  // 加载新场景
  async loadModel(url: string, filename: string) {
    // clear error
    this.events.fire("error", null);

    try {
      const model = (await this.assetLoader.loadModel({
        url,
        filename,
      })) as Splat;
      this.add(model);
      this.updateBound();
      this.events.fire("loaded", filename);
    } catch (err) {
      this.events.fire("error", err);
    }
  }

  // 添加一个场景元素
  add(element: Element) {
    if (!element.scene) {
      // add the new element
      element.scene = this;
      element.add();
      this.elements.push(element);

      // notify all elements of scene addition
      this.forEachElement((e) => e !== element && e.onAdded(element));

      // notify listeners
      this.events.fire("scene.elementAdded", element);
    }
  }

  private forEachElement(action: (e: Element) => void) {
    this.elements.forEach(action);
  }

  // get scene bounds
  updateBound() {
    let valid = false;
    this.forEachElement((e) => {
      if (e.calcBound(bound)) {
        if (!valid) {
          valid = true;
          this.bound.copy(bound);
        } else {
          this.bound.add(bound);
        }
      }
    });
  }

  private onUpdate(deltaTime: number) {
    // allow elements to update
    this.forEachElement((e) => e.onUpdate(deltaTime));

    // fire a 'serialize' event which listers will use to store their state. we'll use
    // this to decide if the view has changed and so requires rendering.
    const i = this.app.frame % 2;
    const state = this.sceneState[i];
    state.reset();
    this.forEachElement((e) => state.pack(e));

    // diff with previous state
    const result = state.compare(this.sceneState[1 - i]);

    // generate the set of all element types that changed
    const all = new Set([
      ...result.added,
      ...result.removed,
      ...result.moved,
      ...result.changed,
    ]);

    // compare with previously serialized
    if (!this.app.renderNextFrame) {
      this.app.renderNextFrame = this.forceRender || all.size > 0;
    }
    this.forceRender = false;

    // update scene bound if models were updated
    if (all.has(ElementType.model)) {
      this.updateBound();
      this.events.fire("scene.boundUpdated");
    }

    // raise per-type update events
    ElementTypeList.forEach((type) => {
      if (all.has(type)) {
        this.events.fire(`updated:${type}`);
      }
    });

    // allow elements to postupdate
    this.forEachElement((e) => e.onPostUpdate());
  }

  private onPreRender() {
    if (this.canvasResize) {
      this.canvas.width = this.canvasResize.width;
      this.canvas.height = this.canvasResize.height;
      this.canvasResize = null;
    }

    // update render target size
    this.targetSize.width = Math.ceil(
      this.app.graphicsDevice.width / this.config.camera.pixelScale
    );
    this.targetSize.height = Math.ceil(
      this.app.graphicsDevice.height / this.config.camera.pixelScale
    );

    this.forEachElement((e) => e.onPreRender());

    this.events.fire("prerender");

    // debug - display scene bound
    if (this.config.debug.showBound) {
      // draw scene bound
      this.app.drawWireAlignedBox(
        this.bound.getMin(),
        this.bound.getMax(),
        Color.GREEN
      );

      // draw element bounds
      this.forEachElement((e: Element) => {
        if (e.type === ElementType.splat) {
          const splat = e as Splat;

          const local = splat.localBound;
          this.app.drawWireAlignedBox(
            local.getMin(),
            local.getMax(),
            Color.BLUE,
            true,
            undefined,
            splat.root.getWorldTransform()
          );

          const world = splat.worldBound;
          this.app.drawWireAlignedBox(
            world.getMin(),
            world.getMax(),
            Color.GRAY
          );
        }
      });
    }
  }

  private onPostRender() {
    this.forEachElement((e) => e.onPostRender());
  }
}

export { Scene };
