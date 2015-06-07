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

  init: function(app) {

    this._super.apply(this,arguments);

    //store reference to the application instance
    this.app = app;
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
