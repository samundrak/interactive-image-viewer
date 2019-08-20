import React from 'react';
import uuid from 'uuid';
import { List, Avatar, Button, Spin } from 'antd';

class CommentBox extends React.Component {
  handleCommentHightlight(comment) {
    return () => {
      this.props.handleCommentHightlight(comment);
    };
  }
  handleCommentDelete(comment) {
    return () => {
      this.props.handleCommentDelete(comment);
    };
  }
  render() {
    return (
      <List
        itemLayout="horizontal"
        header={<div>Comments ({this.props.comments.length})</div>}
      >
        {this.props.comments.map(item => {
          return (
            <List.Item
              actions={[
                <a onClick={this.handleCommentHightlight.bind(this)(item)}>
                  Highlight
                </a>,
                <a onClick={this.handleCommentDelete.bind(this)(item)}>
                  Delete
                </a>,
              ]}
              key={uuid()}
            >
              <List.Item.Meta
                avatar={
                  <Avatar src="https://zos.alipayobjects.com/rmsportal/ODTLcjxAfvqbxHnVXCYX.png" />
                }
                description={item.comment}
              />
            </List.Item>
          );
        })}
      </List>
    );
  }
}

export default CommentBox;
