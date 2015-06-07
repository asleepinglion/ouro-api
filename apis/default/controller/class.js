"use strict";

var SuperJS = require('../../../index');
var Promise = require('bluebird');


/**
 * The default controller provides default routes for the application
 *
 * @exports Controller
 * @namespace SuperJS
 * @extends SuperJS.Class
 */

module.exports = SuperJS.Controller.extend({

  _metaFile: function() {
    this._super();
    this._loadMeta(__filename);
  }

});
