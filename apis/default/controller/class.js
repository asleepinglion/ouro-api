"use strict";

var Ouro = require('../../../index');
var Promise = require('bluebird');


/**
 * The default controller provides default routes for the application
 *
 * @exports Controller
 * @namespace Ouro
 * @extends Ouro.Class
 */

module.exports = Ouro.Controller.extend({

  _metaFile: function() {
    this._super();
    this._loadMeta(__filename);
  }

});
