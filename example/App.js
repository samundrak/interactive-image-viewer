import React from 'react';
import uuid from 'uuid';
import { Row, Col, Card, Button, Divider } from 'antd';
import CommentBox from './CommentBox';

const { Meta } = Card;

const images = [
  {
    src:
      'https://images.unsplash.com/photo-1530600130-16d76247813a?ixlib=rb-0.3.5&s=ef5f5137d47ac67a145abb09a7815b6c&auto=format&fit=crop&w=500&q=80',
    id: 1,
  },
  {
    src:
      'https://images.unsplash.com/photo-1530595663417-ff662189249a?ixlib=rb-0.3.5&ixid=eyJhcHBfaWQiOjEyMDd9&s=ac39f2ce3aee96b300c4a3fc7072481e&auto=format&fit=crop&w=400&q=80',
    id: 2,
  },
  {
    src:
      'https://images.unsplash.com/photo-1530559735072-9c63cacc1f33?ixlib=rb-0.3.5&ixid=eyJhcHBfaWQiOjEyMDd9&s=31a028fe5f8fb4bbb842c8c7b1c0994d&auto=format&fit=crop&w=500&q=80',
    id: 3,
  },
  {
    src:
      'https://images.unsplash.com/photo-1530556383-06e5aaa6f3d4?ixlib=rb-0.3.5&ixid=eyJhcHBfaWQiOjEyMDd9&s=5f3193d62ff02794e23e7e690b31a1ca&auto=format&fit=crop&w=500&q=80',
    id: 4,
  },
  {
    src:
      'https://images.unsplash.com/photo-1530552104885-20965f0170b3?ixlib=rb-0.3.5&ixid=eyJhcHBfaWQiOjEyMDd9&s=9f23bdc9937b81c9ea15b329fb85539f&auto=format&fit=crop&w=500&q=80',
    id: 5,
  },
];
const span = Math.floor(24 / images.length);

class App extends React.Component {
  constructor() {
    super();
    this.state = {
      images,
      image: null,
      comments: [],
    };
  }
  handleImageClick(image) {
    return () => {
      if (!image) return alert('Please preview image first');
      lComments.allDocs(
        { include_docs: true, descending: true },
        (err, doc) => {
          const comments = doc.rows
            .filter(item => item.doc.image_id === image.id)
            .map(item => item.doc);
          this.setState(
            {
              comments,
              image,
            },
            () => {
              this.iiviewer.load({
                ...image,
                comments,
                dimension: {
                  width: 500,
                  height: 500,
                },
              });
            },
          );
        },
      );
    };
  }
  handleCommentHightlight(comment) {
    this.iiviewer.emit('comment:highlight', comment);
  }
  handleCommentDelete(comment) {
    const comments = this.state.comments.filter(
      item => item._id !== comment._id,
    );
    this.setState({
      comments,
    });
    this.iiviewer.emit('comment:delete', comment);
    lComments.remove(comment);
  }
  handlePreviewImage(image) {
    return () => {
      this.setState({
        image,
      });
    };
  }
  render() {
    return (
      <div className="gutter-example">
        <br />
        <Row>
          <Row>
            {this.state.images.map((image, index) => (
              <Col span={span} key={index}>
                <Card
                  hoverable
                  style={{ width: 200, height: 160 }}
                  cover={
                    <img
                      alt="example"
                      src={image.src}
                      style={{ width: 200, height: 100 }}
                    />
                  }
                >
                  <Meta
                    title={[
                      <Button
                        type="dashed"
                        onClick={this.handleImageClick.bind(this)(image)}
                      >
                        Comment
                      </Button>,
                    ]}
                  />
                </Card>
              </Col>
            ))}
          </Row>
          <Divider />
          <Row>
            <Col span={16}>
              {<div id="ii-viewer-container" />}
              <div id="wrapper">
                {this.state.image && (
                  <img
                    src={this.state.image.src}
                    width="900px"
                    height="700px"
                  />
                )}
              </div>
            </Col>
            <Col span={8}>
              <CommentBox
                comments={this.state.comments}
                handleCommentHightlight={this.handleCommentHightlight.bind(
                  this,
                )}
                handleCommentDelete={this.handleCommentDelete.bind(this)}
              />
            </Col>
          </Row>
        </Row>
      </div>
    );
  }

  componentDidMount() {
    this.iiviewer = new IIViewer('ii-viewer-container', 'wrapper');

    const commentStore = [];
    this.iiviewer.on('comment:new', data => {
      const comment = {
        comment: data.comment,
        coordinates: data.coordinates,
        image_id: data.meta.id,
      };
      this.setState({
        comments: [comment].concat(this.state.comments),
      });
      lComments.post(comment, (err, result) => {
        comment._id = result.id;
        this.iiviewer.emit('comment:done', {
          success: err ? false : true,
          data: comment,
        });
      });
    });
  }
}
export default App;
