"use strict";

var SuperJS = require('superjs');
var fs = require('fs');

module.exports = SuperJS.Class.extend({

  _metaFile: function() {
    this._super();
    this._loadMeta(__filename);
  }

});
