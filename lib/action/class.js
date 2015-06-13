"use strict";

var Ouro = require('ouro');
var merge = require('recursive-merge');

module.exports = Ouro.Class.extend({

  _metaFile: function() {
    this._super();
    this._loadMeta(__filename);
  },

  init: function(app, controller) {

    //localize references
    this.app = app;
    this.controller = controller;

    this._super.apply(this, arguments);

    if( controller.model ) {
      this.model = controller.model;
    }

    //process meta again now with model meta data
    this._processMeta(true);
  },

  //verify the request by transforming, validating, and sanitizing parameters
  verify: function(req) {

    //maintain reference to the currrent instance
    var self = this;

    //return promise which is resolved or rejected depending on completion
    return new Promise(function (resolve, reject) {

      //maintain context object of parameters
      var parameters = {};

      //maintain list of closures
      var transforms = [];
      var validations = [];
      var sanitizations = [];

      //loop through all the parameters for this action and
      //append transforms, validations, and sanitizations to their respective lists
      if( self.meta.methods && self.meta.methods.run ) {

        for (var param in self.meta.methods.run.params) {

          //localize a reference to the parametere meta data
          var paramMeta = self.meta.methods.run.params[param];

          //store the parameters value
          parameters[param] = req.param(param);

          //set value to default if its not passed
          if (typeof parameters[param] === 'undefined') {
            parameters[param] = paramMeta.default;
          }

          //add transforms, validations, & sanitizations for this parameter to execution list
          transforms = transforms.concat( self.transform.setup(paramMeta.transform, parameters, param) );
          validations = validations.concat( self.validate.setup(paramMeta.validate, parameters, param, 'parameter') );
          sanitizations = sanitizations.concat( self.sanitize.setup(paramMeta.sanitize, parameters, param));

          //if the the parameter is a model, process attribtue transforms, validations, & sanitizations
          if( paramMeta.model ) {

            //if there are validations for this model and the parameter has been provided
            if( Object.keys(paramMeta.model.validate).length > 0 && typeof parameters[param] !== 'undefined' ) {

              //loop through model validations
              for (var attribute in paramMeta.model.validate) {

                //if defaults are enabled for this action's model and the attribute was not provided
                if (paramMeta.model.defaults === true && Object.keys(parameters[param]).indexOf(attribute) === -1) {

                  //set the value of the attribute to it's specified default
                  parameters[param][attribute] = self.app.models[self.name].attributes[attribute].default;
                }

                //execute validations if the attribute is required or if the attribute has been provided
                if( paramMeta.model.validate[attribute].required === true || typeof parameters[param][attribute] !== 'undefined' ) {

                  //todo: deal with unique, uniquely :)

                  validations = validations.concat( self.validate.setup(paramMeta.model.validate[attribute], parameters[param], attribute, 'attribute'));
                }

              }

              //loop through model sanitizations
              for (var attribute in paramMeta.model.sanitize) {

                //execute sanitization if the attribute has been provided
                if( typeof parameters[param][attribute] !== 'undefined' ) {
                  sanitizations = sanitizations.concat( self.sanitize.setup(paramMeta.model.sanitize[attribute], parameters[param], attribute, 'attribute'));
                }

              }

            }
          }
        }
      }


      var numberOfValidations = validations.length;
      self.log.debug("performing " + transforms.length + " transforms, " + numberOfValidations + " validations, and " + sanitizations.length + " sanitizations...");

      //exceute transforms
      self.transform.process(transforms)

        //execute validations
        .then(function() {
          return self.validate.process(validations);
        })

        //exectute sanitizations
        .then(function() {
          return self.sanitize.process(sanitizations)
        })

        //resolve if all passed without errors
        .then(function() {

          //store the parameters on the request object
          req.parameters = parameters;
          self.log.debug('verified parameters:', parameters);

          resolve();
        })

        //reject if we caught any errors
        .catch(function(err) {

          reject(err);
        });

    });

  },

  //get a parameter's value after tranforms, validations, and sanitizations are complete
  parameter: function(req, param) {

    var context = undefined;

    param = param.split('.');

    for( var i = 0; i < param.length; i++ ) {

      if( i === 0 ) {

        if( typeof req.parameters !== 'object' || typeof req.parameters[param[0]] === 'undefined' ) {
          break;
        }

        context = req.parameters[param[0]];
      } else {
        context = context[param[i]];
      }

    }

    return context;

  },

  //process controller metadata
  _processMeta: function(skipParent) {

    if( !skipParent) {

      //process base meta data
      this._super();

    } else {

      //process action meta data now that we have access to the model

      if (!this.meta.methods.run) {
        throw new Ouro.Error('invalid_meta', 'The `' + this.name + '` action of the `' + this.controller.name + '` is missing the meta data for the run method.');
        return;
      }

      //support parameters alias
      if (this.meta.methods.run.parameters) {
        this.meta.methods.run.params = this.meta.methods.run.parameters;
        delete this.meta.methods.run.params;
      }

      //if the method is missing the params object, create it
      if (!this.meta.methods.run.params) {
        this.meta.methods.run.params = {};
      }

      //loop through parameters for each method
      for (var param in this.meta.methods.run.params) {

        //if transforms are missing on the parameter set up an empty object
        if (!this.meta.methods.run.params[param].transform) {
          this.meta.methods.run.params[param].transform = {};
        }

        //if validations are missing on the parameter set up an empty object
        if (!this.meta.methods.run.params[param].validate) {
          this.meta.methods.run.params[param].validate = {};
        }

        //if type has been specified on the parameter, add it as an actual validation
        //todo: maybe do this on verification, so it can be done before other validations?
        if (this.meta.methods.run.params[param].type) {
          this.meta.methods.run.params[param].validate[this.meta.methods.run.params[param].type] = true;
        }

        this._processMetaComponent('transform', this.meta.methods.run.params[param].transform, {
          controller: this.controller.name,
          action: this.name,
          param: param
        });

        this._processMetaComponent('validate', this.meta.methods.run.params[param].validate, {
          controller: this.controller.name,
          action: this.name,
          param: param
        });

        if( this.meta.methods.run.params[param].model ) {
          this._mergeModelMeta(this.meta.methods.run.params[param].model);
        }

      }
    }
  },

  _processMetaComponent: function(type, list, location) {

    //loop through each item
    for( var method in list ) {

      if( this[type] ) {

        //warn & remove any items
        if (!this[type][method]) {

          var problem = {method: method};

          for (var prop in location) {
            problem[prop] = location[prop];
          }

          this.log.warn(type + ' method missing:', problem);
          delete list[method];
        }

        //remove disabled items
        if (list[method] === false) {
          delete list[method];
        }

      }

    }

  },

  //merge model validation/sanization meta onto controller actions
  _mergeModelMeta: function(model) {

    //if the model option is set to true, copy the integrity checks
    if( model === true ) {

      //if this controller has an associated model and the model's attributes have been defined
      if( this.model && this.model.attributes) {

        //setup default model object on param
        model = {};
        model.transform = {};
        model.validate = {};
        model.sanitize = {};

        //loop through the model's attributes
        for (var attributeName in this.model.attributes) {

          var attribute = this.model.attributes[attributeName];

          //if transforms have been assigned to this attribute, set them up on the param's model
          if( attribute.transform ) {
            model.transform[attributeName] = attribute.transform;
          }

          //if validations have been assigned to this attribute, set them up on the param's model
          if( attribute.validate ) {
            model.validate[attributeName] = attribute.validate;
          }

          //if sanitizations have been assigned to this attribute, set them up on the param's model
          if( attribute.sanitize ) {
            model.sanitize[attributeName] = attribute.sanitize;
          }

          this._processMetaComponent('transform', model.validate[attributeName], { model: this.model.name, attribute: attributeName });
          this._processMetaComponent('validate', model.validate[attributeName], { model: this.model.name, attribute: attributeName });
          this._processMetaComponent('sanitize', model.validate[attributeName], { model: this.model.name, attribute: attributeName });

        }

      }

    //if the model option is set to an object, merge the model's integrity checks
    } else if( typeof model === 'object' ) {

      //todo: support using a different model via _model property?

      //if this controller has an associated model and the model's attributes have been defined
      if( this.model && this.model.meta.attributes ) {

        //make sure we have a validate object on the parameter
        if( !model.transform ) {
          model.transform = {};
        }

        //make sure we have a validate object on the parameter
        if( !model.validate ) {
          model.validate = {};
        }

        //make sure we have a sanitize object on the parameter
        if( !model.sanitize ) {
          model.sanitize = {};
        }

        //loop through the model's attributes
        for (var attributeName in this.model.meta.attributes) {

          var attribute = this.model.meta.attributes[attributeName];

          //if transformations have been assigned to this attribute, set them up on the param's model
          if( attribute.transform ) {
            if( model.transform[attributeName] ) {
              model.transform[attributeName] = merge(model.transform[attributeName], attribute.transform);
            } else {
              model.transform[attributeName] = attribute.transform;
            }
          }

          //if validations have been assigned to this attribute, set them up on the param's model
          if( attribute.validate ) {
            if( model.validate[attributeName] ) {
              model.validate[attributeName] = merge(model.validate[attributeName], attribute.validate);
            } else {
              model.validate[attributeName] = attribute.validate;
            }
          }

          //if sanitizations have been assigned to this attribute, set them up on the param's model
          if( attribute.sanitize ) {
            if( model.sanitize[attributeName] ) {
              model.sanitize[attributeName] = merge(model.sanitize[attributeName], attribute.sanitize);
            } else {
              model.sanitize[attributeName] = attribute.sanitize;
            }
          }

          this._processMetaComponent('transform', model.transform[attributeName], { model: this.model.name, attribute: attributeName });
          this._processMetaComponent('validate', model.validate[attributeName], { model: this.model.name, attribute: attributeName });
          this._processMetaComponent('sanitize', model.sanitize[attributeName], { model: this.model.name, attribute: attributeName });

        }

      }

    }

  }


});
