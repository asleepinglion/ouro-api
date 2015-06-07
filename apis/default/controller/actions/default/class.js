"use strict";

var SuperJS = require('../../../../../index');

module.exports = SuperJS.Action.extend({

  _metaFile: function() {
    this._super();
    this._loadMeta(__filename);
  },

  run: function(resolve, reject, req) {

    resolve({meta:{success: true}});

  }

});
