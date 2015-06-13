"use strict";

var Ouro = require('../../../../../index');

module.exports = Ouro.Action.extend({

  _metaFile: function() {
    this._super();
    this._loadMeta(__filename);
  },

  run: function(resolve, reject, req) {

    resolve({meta:{success: true}});

  }

});
