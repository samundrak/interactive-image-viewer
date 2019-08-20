# Interactive Image Viewer

IIViewer lets user to interact with image by adding area selection to comment, tag memebers or highlight any area of image.

# Installation

Incldue file `iiviewer.js` found inside `build` folder in your project.
If you are not using any build tool then you can add it to your public folder
and link in your html.

`<script src="/iiviewer.js"></script>`

# Usage

Create instance of `IIViewer`:

```
var iiviewer = new IIViewer('#ii-viewer-container','#imageContainerId', options = {}); // Id of container element where lib will mount canvas
```

To open image with `iiviewer`

```
iiviewer.load({
            src: 'Image direct path',
            _id: 'id of image',
            comments: [
                {
                    comment: 'comment value',
                    _id: 'comment_id',
                    coordinates: {
                        x: 'value send by iiviewer on new area selection',
                        y: 'value send by iiviewer on new area selection',
                        width: 'value send by iiviewer on new area selection',
                        height:'value send by iiviewer on new area selection'
                    }
                }
            ],
          });
```

`iiviewer` emits events when some action is occured in canvas or listen event to
let lib do something.

##### Emitted events

- `comment:new` emitted when new comment has been added

  ```
        iiviewer.on('comment:new', data => {
           const comment = {
                comment: data.comment,
                coordinates: data.coordinates,
                image_id: data.meta.id,
           };

        });
  ```

#### Events listened by library

- `comment:done` emit this event when new comment is stored in server on success or error.

  ```
  iiviewer.emit('comment:done', {
      success: err ? false : true,
        data: comment,
      });
  ```

* `comment:delete` emit this event when any comment has been deleted.

```
    iiviewer.emit('comment:delete', { _id: 'comment_id');
```

- `comment:highlight` emit this event when any comment need to be highlighted

```
    iiviewer.emit('comment:highlight',{_id: 'comment_id'});
```

# Contribution

Clone this repo, goto project root and run
`npm i` after that run `npm start` which starts library
example web in development mode.

After changes you can build it by running
`npm run build:lib`
