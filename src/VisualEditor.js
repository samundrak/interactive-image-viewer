/* eslint-disable no-underscore-dangle */
/* global fabric */
import autoBind from 'auto-bind';
import Canvas from './Canvas';
import EventEmitter from './EventEmitter';

const INSIDE_IMPRINT_OBJECTS = 'inside_imprint_objects';

class VisualEditor extends EventEmitter {
  constructor() {
    super();
    autoBind(this);
    this.canvas = null;
    this.objects = new Map();
    this.widthRatio = 0;
    this._saved = false;
    this.heightRatio = 0;
    this.canvasContainer = 'can-main';
    this._designId = null;
    this._sku = null;
    this._eventsToWatch = [
      'object:added',
      'object:modified',
      'object:removed',
      'object:moving',
      'object:scaling',
      'object:rotating',
      'object:selected',
      'selection:created',
      'selection:updated',
      'selection:cleared',
    ];
    this._versions = [new Map([['logo', []]])];
    this._isCorrupted = false;
    this.baseViewPort = null;
    this.canvasContext = null;
    this.scaleLimit = {
      x: { max: 10, min: 0.0 },
      y: { max: 10, min: 0.0 },
    };
    this.pos = { x: 0, y: 0 };
    this.scale = 1;
    this.isZoomEnabled = true;
    this.isPanEnabled = true;
    this.nonRenderedObject = new Map();
    this.groupedObjects = new Map();
    this.groupedObjects.set(INSIDE_IMPRINT_OBJECTS, []);
  }

  changeZoomMode(mode) {
    this.isZoomEnabled = mode;
  }
  changePanMode(mode) {
    this.isPanEnabled = mode;
  }

  setCanvasContainer(canvasContainer, sku = null) {
    this.canvasContainer = canvasContainer;
    this._sku = sku || canvasContainer;
    return this;
  }

  getSku() {
    return this._sku;
  }

  init(canvasOption = {}) {
    this.canvas = new Canvas(this.canvasContainer, canvasOption);
    this.canvasContext = this.canvas.getContext();
    this.canvasContext.preserveObjectStacking = true;
    this.canvasRatio =
      this.canvas.context.contextContainer.canvas.width /
      this.canvasContext.width;
    return this;
  }
  loadImage(src, callback) {
    this.addProductToCanvas(src, (err, object) => {
      this.renderCanvas();
      callback(object);
    });
  }

  resetZoomAndPan() {
    const canvas = this.canvasContext;
    canvas.viewportTransform = [1, 0, 0, 1, 0, 0];
    this.pos.x = canvas.viewportTransform[4];
    this.pos.y = canvas.viewportTransform[5];
    this.zoom(0);
  }

  /* eslint-disable */
  pan(canvas, { clientX = 0, clientY = 0 }) {
    if (isNaN(canvas.viewportTransform[4])) {
      canvas.viewportTransform[4] = 0;
    }
    if (isNaN(canvas.viewportTransform[5])) {
      canvas.viewportTransform[5] = 0;
    }
    this.pos.x = canvas.viewportTransform[4] += clientX - canvas.lastPosX;
    this.pos.y = canvas.viewportTransform[5] += clientY - canvas.lastPosY;
    canvas.lastPosX = clientX;
    canvas.lastPosY = clientY;
  }

  calculatePosition(x, y, _scale) {
    this.pos.x = x - (x - this.pos.x) * _scale;
    this.pos.y = y - (y - this.pos.y) * _scale;
  }

  /**
   * Calling this method will enable zooming on canvas
   */
  enableZoom(onZoom = () => null) {
    const canvas = this.canvasContext;
    canvas.on('mouse:wheel', opt => {
      if (this.isZoomEnabled) {
        this.zoom(opt.e.deltaY, onZoom);
        opt.e.preventDefault();
        opt.e.stopPropagation();
      }
    });

    return this;
  }

  zoom(deltaY, onZoom = () => null) {
    const canvas = this.canvasContext;
    const canvasCenter = new fabric.Point(
      canvas.getWidth() / 2,
      canvas.getHeight() / 2,
    );
    const zoom = canvas.getZoom();
    let cursor = null;
    let zoomLevel = null;
    let zoomRatio = null;
    if (deltaY < 0) {
      cursor = 'zoom-in';
      zoomLevel = zoom * 1.1;
      onZoom({ state: VisualEditor.ZOOM_UP, zoom: zoomLevel });
      if (zoomLevel >= VisualEditor.MAX_ZOOM) return;
      zoomRatio = 1.1;
    } else if (deltaY > 0) {
      cursor = 'zoom-out';
      zoomLevel = zoom / 1.1;
      if (zoomLevel <= VisualEditor.MIN_ZOOM) return;
      onZoom({ state: VisualEditor.ZOOM_DOWN, zoom: zoomLevel });
      zoomRatio = 1 / 1.1;
    } else {
      cursor = 'default';
      zoomRatio = zoomLevel = zoom * 1;
    }
    canvas.setCursor(cursor);
    this.scale = zoomLevel;
    if (zoomRatio) {
      this.calculatePosition(canvasCenter.x, canvasCenter.y, zoomRatio); // zoom in
    }
    this.oldDeltaY = deltaY;
    canvas.zoomToPoint(canvasCenter, zoomLevel);
  }

  /**
   * Calling this method will enable pan on canvas
   */
  enablePanning() {
    const canvas = this.canvasContext;
    const self = this;
    canvas.on('mouse:down', function(opt) {
      if (!self.isPanEnabled) return;
      const evt = opt.e;
      if (!opt.target) return;
      if (
        !self.groupedObjects
          .get(INSIDE_IMPRINT_OBJECTS)
          .includes(opt.target.name)
      ) {
        const e = evt.touches ? evt.touches[0] : evt;
        this.isDragging = true;
        this.selection = false;
        this.lastPosX = e.clientX;
        this.lastPosY = e.clientY;
        canvas.setCursor('-webkit-grabbing');
      }
    });
    canvas.on('mouse:move', function(opt) {
      if (!self.isPanEnabled) return;
      const e = opt.e;
      if (this.isDragging) {
        canvas.forEachObject(obj => {
          obj.setCoords();
        });
        const coords = e.touches ? e.touches[0] : e;
        if (!self.baseViewPort) {
          self.baseViewPort = this.viewportTransform;
        }
        self.pan(canvas, { clientX: coords.clientX, clientY: coords.clientY });
        canvas.renderAll();
      }
    });
    canvas.on('mouse:up', function() {
      if (!self.isPanEnabled) return;
      this.isDragging = false;
      this.selection = true;
    });
    return this;
  }

  createRect(options = {}) {
    const rect = new fabric.Rect(options);
    return rect;
  }

  static fitImage(canvas, imageObj) {
    const obj = {
      renderableWidth: null,
      renderableHeight: null,
      xStart: null,
      yStart: null,
      originalWidth: imageObj.width,
      originalHeight: imageObj.height,
      oldScaleX: this.canvasRatio,
      oldScaleY: this.canvasRatio,
    };

    const imageAspectRatio = imageObj.width / imageObj.height;
    const canvasAspectRatio = canvas.width / canvas.height;

    // If image's aspect ratio is less than canvas's we fit on height
    // and place the image centrally along width
    if (imageAspectRatio < canvasAspectRatio) {
      obj.renderableHeight = canvas.height;
      obj.renderableWidth =
        imageObj.width * (obj.renderableHeight / imageObj.height);
      obj.xStart = (canvas.width - obj.renderableWidth) / 2;
      obj.yStart = 0;
    } else if (imageAspectRatio > canvasAspectRatio) {
      // If image's aspect ratio is greater than canvas's we fit on width
      // and place the image centrally along height

      obj.renderableWidth = canvas.width;
      obj.renderableHeight =
        imageObj.height * (obj.renderableWidth / imageObj.width);
      obj.xStart = 0;
      obj.yStart = (canvas.height - obj.renderableHeight) / 2;
    } else {
      // Happy path - keep aspect ratio
      obj.renderableHeight = canvas.height;
      obj.renderableWidth = canvas.width;
      obj.xStart = 0;
      obj.yStart = 0;
    }
    return obj;
  }

  static getBlobFromUrl(url, onComplete) {
    const reader = new FileReader();
    reader.onload = event => {
      if (!event || !event.target) {
        return onComplete(new Error('Unable to retrieve blob'));
      }
      return onComplete(null, event.target.result);
    };
    return reader.readAsDataURL(url);
  }

  _attachProduct({ image, objectType }, onComplete) {
    fabric.Image.fromURL(image, originalImage => {
      this.fitImageMeta = VisualEditor.fitImage(
        this.canvas.getContext(),
        originalImage,
      );
      originalImage.set({
        left: this.fitImageMeta.xStart,
        top: this.fitImageMeta.yStart,
        selectable: false,
        width: this.fitImageMeta.renderableWidth,
        height: this.fitImageMeta.renderableHeight,
        name: objectType,
      });
      this.remove(objectType);
      this.addObjectToCanvas(objectType, originalImage);
      onComplete(null, originalImage);
    });
  }
  addProductToCanvas(image, onComplete) {
    return this._attachProduct({ image, objectType: 'product' }, onComplete);
  }

  setFitMeta(fitMeta = null) {
    const meta = fitMeta || this.fitImageMeta;
    this.widthRatio = meta.renderableWidth / meta.originalWidth;
    this.heightRatio = meta.renderableHeight / meta.originalHeight;
    return this;
  }

  static getAspectAsPerOldImage({ newImage, oldImage, currentRatio }) {
    const diffBetweenOldAndNew = 100 - (newImage / oldImage) * 100; // eslint-disable-line
    const diffWithCurrentRatio = (diffBetweenOldAndNew / 100) * currentRatio; // eslint-disable-line
    return currentRatio - diffWithCurrentRatio;
  }

  getObjectFromUrl(url, callback) {
    fabric.Image.fromURL(url, object => {
      callback(object);
    });
  }

  hideObject(objectName) {
    const lObject = this.getObject(objectName);
    if (!lObject) return;
    lObject.set({ opacity: 0 });
    // this.canvasContext.renderAll();
  }
  showObject(objectName) {
    const lObject = this.getObject(objectName);
    if (!lObject) return;
    lObject.set({ opacity: 1 });
    // this.canvasContext.renderAll();
  }
  addObjectToCanvas(name, object) {
    this.objects.set(name, object);
    return this.canvas.add(object);
  }

  remove(objectId) {
    const item = this.objects.get(objectId);
    if (!item) return this;
    this.canvas.remove(item);
    this.objects.delete(objectId);
    this.canvas.getContext().renderAll();

    const insideImprintRefs = this.groupedObjects.get(INSIDE_IMPRINT_OBJECTS);
    const imprintRefsIndex = insideImprintRefs.findIndex(id => id === objectId);
    if (imprintRefsIndex > -1) {
      insideImprintRefs.splice(imprintRefsIndex, 1);
    }

    return this;
  }

  getObject(objectName) {
    return this.objects.get(objectName);
  }

  getDimension() {
    const { width, height } = this.canvas.getContext();
    return {
      width,
      height,
    };
  }

  renderCanvas() {
    return this.canvas.getContext().renderAll();
  }

  clearCanvas() {
    const canvas = this.canvas.getContext();
    for (const value of this.objects.values()) {
      canvas.remove(value);
    }
    return canvas.clear();
  }

  hideCanvas() {
    this.canvas.getContext().wrapperEl.style.display = 'none';
  }

  showCanvas() {
    this.canvas.getContext().wrapperEl.style.display = 'block';
  }
}

VisualEditor.MIN_ZOOM = 0.99;
VisualEditor.MAX_ZOOM = 10;
VisualEditor.ZOOM_UP = 'up';
VisualEditor.ZOOM_DOWN = 'down';
export default VisualEditor;
