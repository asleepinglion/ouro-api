"use strict";

var SuperJS = require('../../index');
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
  },

  default: function(resolve, reject, req) {

    resolve({meta:{success: true, test: false}});

  },

  describe: function(resolve, reject, req) {

    //maintain reference to instance
    var self = this;

    //init response object
    var response = { meta: { success: true } };

    //localize the options parameter
    var options = req.parameters.options;

    //if controllers are enabled
    if( options.controllers === true || typeof options.controllers === 'object' ) {

      //create a controllers object for the response
      response.controllers = {};

      //loop through the loaded controllers
      for ( var controller in self.app.controllers ) {

        //copy the blueprint for the controller
        response.controllers[controller] = JSON.parse(JSON.stringify(self.app.controllers[controller].meta));

        if( typeof options.controllers === 'object' ) {
          self.pruneObject(options.controllers, response.controllers[controller], controller);
        }

      }
    }

    //if models are enabled
    if( options.models === true || typeof options.models === 'object' ) {

      //create a controllers object for the response
      response.models = {};

      //loop through the loaded controllers
      for ( var model in self.app.models ) {

        //console.log(self.app.models[model]);

        //setup the model
        response.models[model] = {};

        //copy the model description
        response.models[model].description = self.app.models[model].description;

        //copy the model connection
        response.models[model].connection = self.app.models[model].connection;

        //copy the model attributes
        response.models[model].attributes = JSON.parse(JSON.stringify(self.app.models[model].attributes));

        if( typeof options.models === 'object' ) {
          self.pruneObject(options.models, response.models[model], model);
        }

      }
    }

    resolve(response);


  },

  pruneObject: function(options,context,contextName) {

    //loop through context properties and delete based on options
    for( var property in context) {

      //console.log(contextName, property, typeof options[property], typeof context, context);

      //if the property is false or undefined on the options, delete it
      if( typeof options[property] === 'undefined' || options[property] === false ) {

        delete context[property];

      } else if( typeof options[property] === 'object') {

        for( var subProperty in context[property] ) {
          this.pruneObject(options[property],context[property][subProperty],"." + contextName + "." + property + "." + subProperty);
        }

      }
    }

  }

});
