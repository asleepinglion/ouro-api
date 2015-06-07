"use strict";

var SuperJS = require('../../../../../index');

module.exports = SuperJS.Action.extend({

  _metaFile: function() {
    this._super();
    this._loadMeta(__filename);
  },
  
  run: function(resolve, reject, req) {

    console.log(this.app);

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
          self._pruneMetaData(options.controllers, response.controllers[controller], controller);
        }

      }
    }

    //if models are enabled
    if( options.models === true || typeof options.models === 'object' ) {

      //create a controllers object for the response
      response.models = {};

      //loop through the loaded controllers
      for( var adapter in self.app.adapters ) {

        for( var model in self.app.adapters[adapter].models ) {

          //console.log(self.app.models[model]);

          //setup the model
          response.models[model] = {};

          //copy the model description
          response.models[model].description = self.app.adapters[adapter].models[model].description;

          //copy the adapter name
          response.models[model].adapter = adapter;

          //copy the model connection
          response.models[model].connection = self.app.adapters[adapter].models[model].connection;

          //copy the model attributes
          response.models[model].attributes = JSON.parse(JSON.stringify(self.app.adapters[adapter].models[model].attributes));

          if (typeof options.models === 'object') {
            self._pruneMetaData(options.models, response.models[model], model);
          }

        }
      }
    }

    resolve(response);


  },

  _pruneMetaData: function(options, context, contextName) {

    //loop through context properties and delete based on options
    for( var property in context) {

      //console.log(contextName, property, typeof options[property], typeof context, context);

      //if the property is false or undefined on the options, delete it
      if( typeof options[property] === 'undefined' || options[property] === false ) {

        delete context[property];

      } else if( typeof options[property] === 'object') {

        for( var subProperty in context[property] ) {
          this._pruneMetaData(options[property],context[property][subProperty],"." + contextName + "." + property + "." + subProperty);
        }

      }
    }

  }

});
