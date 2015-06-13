
"use strict";

var Ouro = require('ouro');

module.exports = Ouro.Class.extend({

  _metaFile: function() {
    this._loadMeta(__filename);
  },

  init: function(app) {

    this._super.apply(this, arguments);

    //localize reference to the app
    this.app = app;

  },

  _processMeta: function() {

    this._super();

    var self = this;

    if( this.attributes ) {

      //maintain list of bad validations
      var badValidations = [];

      for( var attributeName in this.attributes ) {

        if( typeof this.attributes[attributeName].validate === 'object' ) {

          for( var validation in this.attributes[attributeName].validate ) {

            if( !this.validate[validation] ) {

              if (badValidations.indexOf(validation) === -1) {
                badValidations.push(validation);
              }

              delete this.attributes[attributeName].validate[validation];
            }

          }
        }
      }

      badValidations.map(function(validation) {
        self.log.warn('validation missing:',{validation: validation, model: self.name});
      });
    }
  }

});
