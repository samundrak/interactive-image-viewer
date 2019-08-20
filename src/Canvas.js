/* global fabric */
class Canvas {
  constructor(container, { isStatic = false }) {
    this.context = isStatic
      ? new fabric.StaticCanvas(container)
      : new fabric.Canvas(container);
    this.objects = [];
  }

  getContext() {
    return this.context;
  }

  add(object) {
    return this.context.add(object);
  }

  remove(object) {
    return this.context.remove(object);
  }

  renderAll() {
    return this.context.renderAll();
  }

  getObjects() {
    return this.context.getObjects();
  }
}

export default Canvas;
