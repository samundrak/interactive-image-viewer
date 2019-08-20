class Selections {
  constructor(context, dimension) {
    this.context = context;
    this.editor = context.editor;
    this.dimension = dimension;
    this.items = [];
  }

  changeSelectionsVisibility(opacity) {
    this.group.set({
      opacity,
    });
  }
  create(selections) {
    selections.forEach(selection => {
      const coords = this.decodeCoords(selection.coordinates);
      const item = this._objectFactory(selection._id, coords);
      this.items.push(item);
    });

    this.items.forEach(item => {
      this.editor.addObjectToCanvas(`selection_${item.name}`, item);
    });
  }
  _objectFactory(name, options) {
    const object = new fabric.Rect({
      width: options.width,
      height: options.height,
      top: options.y,
      left: options.x,
      name,
      fill: 'transparent',
      stroke: this.context._config.commentBorderColor,
      strokeWidth: this.context._config.commentBorderWidth,
      selectable: false,
    });
    return object;
  }
  add(selection) {
    const coords = this.decodeCoords(selection.coordinates);
    this.editor.addObjectToCanvas(
      `selection_${selection._id}`,
      this._objectFactory(selection._id, coords),
    );
  }
  decodeCoords({ x, y, width, height }) {
    const dimension = this.dimension;
    return {
      x: (x / 100) * dimension.width,
      y: (y / 100) * dimension.height,
      width: (width / 100) * dimension.width,
      height: (height / 100) * dimension.height,
    };
  }
  remove(selection) {
    this.editor.remove(`selection_${selection._id}`);
  }
}
export default Selections;
