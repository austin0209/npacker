import IData from "./image.js";
import Jimp from "jimp";

class CanvasNode {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  idata: IData;

  constructor(
    x: number,
    y: number,
    w: number,
    h: number,
    idata = null as IData
  ) {
    this.x = x;
    this.y = y;
    this.width = w;
    this.height = h;
    this.idata = idata;
  }

  get area() {
    return this.width * this.height;
  }
}

export default class Canvas {
  private readonly width: number;
  private readonly height: number;
  private border: number;
  private nodes: CanvasNode[];

  constructor(w: number, h: number, border = 0) {
    this.width = w;
    this.height = h;
    this.border = border;
    this.nodes = [
      new CanvasNode(border, border, w - border, h - border),
      new CanvasNode(0, 0, w, border),
      new CanvasNode(0, 0, border, h),
    ];
    this.clean();
  }

  private removeNode(toRemove: CanvasNode) {
    for (let i = 0; i < this.nodes.length; i++) {
      if (toRemove == this.nodes[i]) {
        return this.nodes.splice(i, 1);
      }
    }
  }

  clean() {
    this.nodes = this.nodes.filter((n) => n.area != 0);
    this.nodes.sort((a, b) => a.area - b.area);
  }

  push(_idata: IData) {
    const idata = _idata;
    for (let i = 0; i < this.nodes.length; i++) {
      let n = this.nodes[i];
      let image = idata.img;
      if (
        n.idata == null &&
        n.width >= image.getWidth() &&
        n.height >= image.getHeight()
      ) {
        let newNode = new CanvasNode(
          n.x,
          n.y,
          image.getWidth(),
          image.getHeight(),
          idata
        );
        let right = new CanvasNode(
          n.x + image.getWidth(),
          n.y,
          n.width - image.getWidth(),
          image.getHeight()
        );
        let bot = new CanvasNode(
          n.x,
          n.y + image.getHeight(),
          n.width,
          n.height - image.getHeight()
        );
        this.removeNode(n);
        this.nodes.push(newNode, right, bot);
        this.clean();
        return true;
      }
    }
    return false;
  }

  getPng() {
    return new Promise<Jimp>((resolve, reject) => {
      new Jimp(this.width, this.height, (err, image) => {
        if (err) {
          reject("Error creating PNG file!");
          return;
        }
        this.nodes.forEach((n) => {
          if (n.idata != null) {
            image.blit(n.idata.img, n.x, n.y);
          }
        });
        resolve(image);
      });
    });
  }

  getJson(filename: string) {
    let result = { METADATA: {}, sprites: [] };
    result.METADATA["name"] = filename;
    if (this.width == this.height) {
      result.METADATA["size"] = this.width;
    } else {
      result.METADATA["width"] = this.width;
      result.METADATA["height"] = this.height;
    }
    for (let i = 0; i < this.nodes.length; i++) {
      let n = this.nodes[i];
      if (n.idata != null) {
        result.sprites.push({
          name: n.idata.name.split(".")[0],
          x: n.x,
          y: n.y,
          width: n.width - this.border,
          height: n.height - this.border,
          trimRect: { width: n.idata.trimW, height: n.idata.trimH },
        });
      }
    }
    return JSON.stringify(result, null, 4);
  }
}
