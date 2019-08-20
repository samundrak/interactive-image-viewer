import uuid from 'uuid';
import View from './View';
import VisualEditor from './VisualEditor';
import EventEmitter from './EventEmitter';
import Commentbox from './Commentbox';
import Selections from './Selections';
import consts from './consts';

class IIViewer extends EventEmitter {
  /**
   * @constructor
   * @param {string} containerId - id of container where viewer will mount
   * @param {object} options
   */
  constructor(containerId, imageContainer, options = {}) {
    super();
    this._containerId = containerId;
    this._config = Object.assign(
      {
        commentBorderColor: 'yellow',
        commentBorderWidth: 2,
        selectionBoxBorderColor: 'red',
        selectionBoxBorderWidth: 2,
      },
      options,
    );
    this._view = new View();
    this._canvasId = uuid();
    this._commentBox = null;
    this._currentItem = null;
    this._imageContainer = imageContainer;
    this._imageContainerEl = null;
    this.on(consts.COMMENT_DONE, this.handleCommentComplete.bind(this));
    this.on(consts.COMMENT_HIGHLIGHT, this.handleHightlightComment.bind(this));
    this.on(consts.COMMENT_DELETE, this.handleCommentDelete.bind(this));
    this.on('selection');
  }
  /**
   * Bootstraps application, reads container bounds, creates canvas,
   * run this only once.
   */
  boot({ canvas, dimension }) {
    this._createTree({ ...dimension });
    this._createInputBubble();
    this.editor = new VisualEditor();
    this.editor.setCanvasContainer(this._canvasId).init();
    this.editor.canvasContext.set({
      selection: false,
      cursor: 'crosshair',
      hoverCursor: 'crosshair',
    });

    this._createSelectionBox();
    this.registerCropOverlayHelpers({
      dimension,
      overlay: this._selectionBox,
    });
    this.fit = VisualEditor.fitImage(this.editor.canvasContext, dimension);
    this.editor.canvasContext
      .on('mouse:down', e => {
        this.enterAreaSelectionMode(e);
      })
      .on('mouse:up', e => {
        this.exitAreaSelectionMode(e);
      })
      .on('mouse:move', e => {
        this.processAreaSelection(e);
      })
      .on('selection:created', e => {
        console.log(e);
      });
    document.body.addEventListener('keyup', e => {
      if (e.keyCode === IIViewer.ESCAPE_KE_CODE) {
        this.exitSelection();
      }
    });
    this.editor.renderCanvas();
  }
  handleCommentDelete(data) {
    this._selections.remove(data);
    this.exitSelection();
  }
  _createSelectionBox() {
    this._selectionBox = this.editor.createRect({
      width: 0,
      height: 0,
      fill: 'transparent',
      stroke: this._config.selectionBoxBorderColor,
      strokeWidth: this._config.selectionBoxBorderWidth,
    });
    this._selectionBox.setControlsVisibility({
      mtr: false,
      bl: false,
      br: false,
      tr: false,
      mt: true,
      ml: true,
      tl: false,
      mr: true,
      mb: true,
    });
    this.editor.addObjectToCanvas('selectionBox', this._selectionBox);
  }
  _changeHighlightOverlayHelpersVisibility(opacity) {
    Object.keys(this._highlightOverlayHelpers || {}).forEach(itemName => {
      this._highlightOverlayHelpers[itemName].set({
        opacity,
      });
    });
  }
  _hideSelectionBox() {
    this._selectionBox.set({
      opacity: 0,
    });
    this._changeHighlightOverlayHelpersVisibility(0);
  }
  _showSelectionBox(options = {}) {
    this._selectionBox.set({
      opacity: 1,
      ...options,
    });
    this._changeHighlightOverlayHelpersVisibility(0.2);
  }
  handleHightlightComment(comment) {
    const object = this.editor.getObject(`selection_${comment._id}`);
    if (!object) return;
    this.highlightComment(object);
  }
  _createInputBubble() {
    if (!this._containerEl) {
      return;
    }
    this._commentBox = new Commentbox(this);
    this._commentBox.on('comment:added', this.handleNewComment.bind(this));
    this._containerEl.insertAdjacentElement(
      'beforeend',
      this._commentBox.render(),
    );
  }
  handleNewComment({ comment }) {
    this._commentBox.disable();
    this.emit(consts.COMMENT_NEW, {
      comment,
      coordinates: this.getCoordinates(),
      meta: this._currentItem,
    });
  }

  showBubble() {
    const x = this._selectionBox.getLeft() + this._selectionBox.getWidth();
    const y = this._selectionBox.getTop() + this._selectionBox.getHeight();
    this._commentBox.show().position({ x, y });
  }
  enterAreaSelectionMode(options) {
    const { e, target } = options;
    if (this._commentBox) {
      this._commentBox.hide();
    }
    this.editor.renderCanvas();
    this._selectionBox.bringForward();
    this._selectionBox.set({
      left: e.layerX,
      top: e.layerY,
      width: 0,
      height: 0,
    });
    this._showSelectionBox();
    this.balanceHelpers({
      target: this._selectionBox,
      dimension: this.dimension,
    });
    this.editor.renderCanvas();
    this._areaSelectionMode = true;
  }
  processAreaSelection({ e, target }) {
    if (this._areaSelectionMode) {
      const image = this.editor.canvasContext;
      const width = e.layerX - this._selectionBox.getLeft();
      const height = e.layerY - this._selectionBox.getTop();
      const coords = {
        width,
        height,
      };
      if (this._selectionBox.getLeft() + width > image.getWidth() - 5) {
        delete coords.width;
      }
      if (
        this._selectionBox.getTop() + this._selectionBox.getHeight() >
        image.getHeight() - 5
      ) {
        delete coords.height;
      }
      this._selectionBox.set(coords);
      this.balanceHelpers({
        target: this._selectionBox,
        dimension: this.dimension,
      });

      this.editor.renderCanvas();
    }
  }

  highlightComment(target) {
    this._showSelectionBox({
      width: target.width,
      height: target.height,
      left: target.left,
      top: target.top,
    });
    this.balanceHelpers({
      target: this._selectionBox,
      dimension: this.dimension,
    });
    this._selectionBox.bringToFront();
  }
  exitAreaSelectionMode({ e, target }) {
    this._areaSelectionMode = false;
    if (
      this._selectionBox.getWidth() > 5 &&
      this._selectionBox.getHeight() > 5
    ) {
      this.showBubble();
    } else {
      if (target && target.name) {
        this.highlightComment(target);
        this.editor.renderCanvas();
        this.emit(consts.COMMENT_SELECTED, { id: target.name });
      } else {
        this.exitSelection();
      }
    }
  }

  exitSelection() {
    this._commentBox.clear();
    this._commentBox.hide();
    this._hideSelectionBox();
    this.editor.renderCanvas();
  }
  highlightSelectionAreas(comments = []) {
    comments.forEach(comment => {
      const coords = this.decodeCoords(comment.coordinates);
      console.log(coords);
    });
  }
  load(options) {
    const img = new Image();
    img.src = options.src;
    const self = this;
    const imageContainerEl = document.getElementById(this._imageContainer);
    if (imageContainerEl) {
      this._imageContainerEl = imageContainerEl.querySelector('img');
    }
    img.onload = function(event) {
      if (self._containerEl) {
        self._containerEl.innerHTML = '';
      }
      self.dimension = {
        width: this.naturalWidth,
        height: this.naturalHeight,
      };
      if (options.dimension) {
        self.dimension = options.dimension;
      }
      if (self._imageContainerEl && !options.dimension) {
        const bound = self._imageContainerEl.getBoundingClientRect() || {};
        let width =
          bound.width ||
          parseInt(
            self._imageContainerEl.getAttribute('width') ||
              self._imageContainerEl.style.width,
          );
        let height =
          bound.height ||
          parseInt(
            self._imageContainerEl.getAttribute('height') ||
              self._imageContainerEl.style.height,
          );
        self.dimension = {
          width,
          height,
        };
      }
      self.boot({
        canvas: self.dimension,
        dimension: self.dimension,
      });
      self._currentItem = options;
      self._changeHighlightOverlayHelpersVisibility(0);
      self._selections = new Selections(self, self.dimension);
      const filteredComments = options.comments.filter(
        comment => comment.coordinates,
      );
      self._selections.create(filteredComments);
      self.editor.renderCanvas();
      const canvas = self.editor.canvasContext;
      fabric.Image.fromURL(options.src, function(img) {
        // add background image
        canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas), {
          scaleX: canvas.width / img.width,
          scaleY: canvas.height / img.height,
        });
      });
      // self.editor.loadImage(options.src, object => {
      //   if (object) {
      //     object.sendToBack();
      //   }
      // });
    };
  }
  _createTree({ width, height }) {
    const container = this.getContainerEl(this._containerId);
    const div = View.createElement('div')('');
    const canvas = View.createCanvas(this._canvasId, width, height);
    div.appendChild(canvas);
    container.appendChild(div);
  }

  getContainerEl(elId) {
    if (!this._containerEl) {
      this._containerEl = document.getElementById(elId);
    }
    return this._containerEl;
  }

  edgeDetect({ target }) {
    const img = this.editor.getObject('product');
    const container = {
      width: img.getWidth(),
      height: img.getHeight(),
      left: img.getLeft(),
      top: img.getTop(),
    };
    const left = target.getLeft();
    const top = target.getTop();
    const overlayWidth = target.getWidth();
    const overlayHeight = target.getHeight();
    this.lockDrag = false;
    if (left < container.left) {
      target.set({ left: container.left });
    }
    if (top < container.top) {
      target.set({ top: container.top });
    }
    if (left + overlayWidth > container.left + container.width) {
      this.lockDrag = true;
      this._selectionBox.set({
        width: target.oldWidth === undefined ? target.width : target.oldWidth,
      });
    }
    if (top + overlayHeight > container.top + container.height) {
      this._selectionBox.set({
        height:
          target.oldHeight === undefined ? target.height : target.oldHeight,
      });
    }
    target.oldWidth = target.getWidth();
    target.oldHeight = target.getHeight();
  }
  balanceHelpers({ target, dimension }) {
    this.editor.getObject('cropOverlayHelperLeft').set({
      width: target.getLeft(),
    });
    this.editor.getObject('cropOverlayHelperTop').set({
      width: target.getWidth(),
      left: target.getLeft(),
      height: target.getTop(),
    });
    this.editor.getObject('cropOverlayHelperRight').set({
      left: target.getLeft() + target.getWidth(),
      width: dimension.width - target.getLeft() + target.getWidth(),
    });
    this.editor.getObject('cropOverlayHelperBottom').set({
      width: target.getWidth(),
      left: target.getLeft(),
      top: target.getTop() + target.getHeight(),
      height: dimension.height - target.getTop() + target.getHeight(),
    });
  }

  highLightOverlayFactory(options) {
    return new fabric.Rect({
      left: 0,
      top: 0,
      color: 'black',
      opacity: 0.3,
      selectable: false,
      selected: true,
      ...options,
    });
  }

  registerCropOverlayHelpers({ dimension, overlay }) {
    this._highlightOverlayHelpers = {};
    this._highlightOverlayHelpers.cropOverlayHelperLeft = this.highLightOverlayFactory(
      {
        width: overlay.left,
        left: 0,
        top: 0,
        height: dimension.height,
      },
    );
    this._highlightOverlayHelpers.cropOverlayHelperTop = this.highLightOverlayFactory(
      {
        width: overlay.width,
        left: overlay.left,
        height: overlay.top,
      },
    );
    this._highlightOverlayHelpers.cropOverlayHelperRight = this.highLightOverlayFactory(
      {
        width: dimension.width - overlay.left + overlay.width,
        left: overlay.left + overlay.width,
        top: 0,
        height: dimension.height,
      },
    );
    this._highlightOverlayHelpers.cropOverlayHelperBottom = this.highLightOverlayFactory(
      {
        width: overlay.getWidth(),
        left: overlay.left,
        top: overlay.top + overlay.getHeight(),
        height: dimension.height - overlay.top + overlay.getHeight(),
      },
    );
    Object.keys(this._highlightOverlayHelpers).forEach(key => {
      this.editor.addObjectToCanvas(key, this._highlightOverlayHelpers[key]);
    });
  }

  getCoordinates() {
    const selectionBox = this._selectionBox;
    const dimension = this.dimension;
    const coords = {
      left: selectionBox.getLeft(),
      top: selectionBox.getTop(),
      width: selectionBox.getWidth(),
      height: selectionBox.getHeight(),
    };
    return {
      x: (coords.left / dimension.width) * 100,
      y: (coords.top / dimension.height) * 100,
      width: (coords.width / dimension.width) * 100,
      height: (coords.height / dimension.height) * 100,
      raw: coords,
    };
  }

  handleCommentComplete({ success = true, data }) {
    this._commentBox.enable();
    if (success) {
      this._selections.add(data);
      this.exitSelection();
      return;
    }
  }
}

IIViewer.ESCAPE_KE_CODE = 27;
IIViewer.events = consts;
export default IIViewer;
