"use strict";

var SuperJS = require('superjs');

var Promise = require('bluebird');
var path = require('path');
var merge = require('recursive-merge');

module.exports = SuperJS.Class.extend({

  _metaFile: function() {
    this._super();
    this._loadMeta(__filename);
  },

  init: function(app, adapter, name) {

    this._super.apply(this,arguments);

    //store reference to the application instance
    this.app = app;

    //set the controller name
    this.name = name;

    if( adapter ) {

      //maintain a reference to the adapter
      this.adapter = adapter;

      //maintain a reference to models
      this.models = this.adapter.models;
    }
  },

  //can be overridden by the controller extension to manipulate the request or response
  beforeAction: function(resolve, reject, req) {

    resolve({});

  },

  //can be overridden by the controller extension to manipulate the request or response
  afterAction: function(resolve, reject, req, res) {

    resolve({});
  }

});
