"use strict";

var Ouro = require('ouro');
var fs = require('fs');

module.exports = Ouro.Class.extend({

  _metaFile: function() {
    this._super();
    this._loadMeta(__filename);
  },

  init: function(app) {

    this._super.apply(this, arguments);

    //localize reference to the app
    this.app = app;
  }

});
