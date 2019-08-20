import EventEmitter from './EventEmitter';
import consts from './consts';

class Commentbox extends EventEmitter {
  constructor() {
    super();
    this._container = null;
  }

  show() {
    this._container.style.display = 'block';
    this._inputEl.focus();
    return this;
  }
  hide() {
    this._container.style.display = 'none';
    return this;
  }
  position({ x = 0, y = 0 }) {
    this._container.style.top = `${y}px`;
    this._container.style.left = `${x}px`;
  }
  render() {
    this._container = document.createElement('div');
    this._container.style.position = 'absolute';
    this._container.style.top = '0';
    this._container.style.left = '0';
    this._container.style.display = 'none';

    const template = `
                <form name="iiviewer-commentbox">
                    <textarea rows="3" col="20" placeholder="Enter comment"></textarea>
                    <br/>
                    <input type="submit" value="submit"/>
                </form>
            `;
    this._container.innerHTML = template;
    this._inputEl = this._container.querySelector('textarea');
    this._buttonEl = this._container.querySelector('input[type=submit]');
    this._inputEl.addEventListener('change', this.handleInputChange.bind(this));
    this._commentBox = this._container.querySelector('form');
    this._commentBox.addEventListener(
      'submit',
      this.handleCommentSubmit.bind(this),
    );
    return this._container;
  }
  handleInputChange(event) {}
  handleCommentSubmit(event) {
    event.preventDefault();
    this.emit(consts.COMMENT_ADDED, {
      comment: this._inputEl.value,
    });
  }

  clear() {
    this._inputEl.value = '';
    this.emit(consts.COMMENT_CLEAR);
  }

  enable() {
    this._container.style.opacity = 1;
    this._commentBox.disabled = false;
    this._inputEl.disabled = false;
    this._buttonEl.disabled = false;
  }
  disable() {
    this._container.style.opacity = 0.5;
    this._commentBox.disabled = true;
    this._inputEl.disabled = true;
    this._buttonEl.disabled = true;
  }
}

export default Commentbox;
