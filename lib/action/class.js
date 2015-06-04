"use strict";

var SuperJS = require('superjs');

module.exports = SuperJS.Class.extend({

  _metaFile: function() {
    this._loadMeta(__filename);
  }

});
