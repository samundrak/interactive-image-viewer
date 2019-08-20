import React from 'react';
import { render } from 'react-dom';
import App from './App';
import PouchDB from 'pouchdb-browser';

const comments = new PouchDB('comments');

window.lComments = comments;
render(<App />, document.getElementById('root'));
