
"use strict";

var SuperJS = require('superjs');

module.exports = SuperJS.Class.extend({

  _metaFile: function() {
    this._loadMeta(__filename);
  },

  init: function(app) {

    this._super.apply(this, arguments);

    //localize reference to the app
    this.app = app;

  }

});
