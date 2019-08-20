class View {
  static createCanvas(elementId, width = '560', height = '480') {
    const canvas = document.createElement('canvas');
    canvas.setAttribute('id', elementId);
    canvas.setAttribute('width', width);
    canvas.setAttribute('height', height);
    return canvas;
  }

  /**
   * Creates html element and fill attributes if provided
   * @param {HTMLElement} element
   * @param {object} attributes
   * @returns {Element}
   */
  static createElement(element, attributes = {}) {
    const el = document.createElement(element);
    return value => {
      if (value) {
        el.innerHTML = value;
      }
      return el;
    };
  }
}

export default View;
