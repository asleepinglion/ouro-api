"use strict";

var SuperJS = require('superjs');

var Promise = require('bluebird');
var path = require('path');

module.exports = SuperJS.Class.extend({

  _metaFile: function() {
    this._super();
    this._loadMeta(__filename);
  },

  init: function(app) {

    this._super.apply(this,arguments);

    //store reference to the application instance
    this.app = app;
  },

  //can be overridden by the controller extension to manipulate the request or response
  beforeAction: function(resolve, reject, req) {

    resolve({});

  },

  //verify the request by transforming, validating, and sanitizing parameters
  verifyRequest: function(req) {


    //maintain reference to the currrent instance
    var self = this;

    //return promise which is resolved or rejected depending on completion
    return new Promise(function (resolve, reject) {

      //self.app.log.debug('request body:', req.body);

      //maintain context object of parameters
      var parameters = {};

      //maintain list of closures which contain promises for each process
      var transforms = [];
      var validations = [];
      var sanitizations = [];
      var modelValidations = [];

      //loop through all the parameters for this action and
      //append transforms, validations, and sanitizations to their respective lists
      for (var param in self.meta.methods[req.action].params) {

        //store the parameters value
        parameters[param] = req.param(param);

        //set value to default if its not passed
        if( typeof parameters[param] === 'undefined' ) {
          parameters[param] = self.meta.methods[req.action].params[param].default;
        }

        //setup transforms
        transforms = transforms.concat(
          self.transform.setup(
            self.meta.methods[req.action].params[param].transform, parameters, param)
        );

        //setup validations
        validations = validations.concat(
          self.validate.setup(
            self.meta.methods[req.action].params[param].validate, parameters, param, 'parameter')
        );

        //setup sanitizations
        //sanitizations = sanitizations.concat(self.app.services.sanitize.setup(self.meta.methods[req.action].params[param].sanitize, parameters, param));

        /*
        //if the the parameter is a model, process attribtue transforms, validations, & sanitizations
        if( self.meta.methods[req.action].params[param].model ) {

          //if there are validations for this model and
          if( Object.keys(self.meta.methods[req.action].params[param].model.validate).length > 0 &&

            //the parameter has not been passed
            typeof parameters[param] !== 'undefined') {

              //loop through model validations
              for (var attribute in self.meta.methods[req.action].params[param].model.validate) {

                //if defaults are enabled for this action's model and
                if( self.meta.methods[req.action].params[param].model.defaults === true &&

                  //the attribute was not provided
                  Object.keys(parameters[param]).indexOf(attribute) === -1) {

                    //set the value of the attribute to it's specified default
                    parameters[param][attribute] = self.app.models[self.name].attributes[attribute].defaultsTo;
                }

                //execute validations if the attribute is required or
                if( self.meta.methods[req.action].params[param].model.validate[attribute].required === true ||

                  //if the attribute has been provided
                  typeof parameters[param][attribute] !== 'undefined') {

                    modelValidations = modelValidations.concat(
                      self.app.services.validate.setup(
                        self.meta.methods[req.action].params[param].model.validate[attribute],
                        parameters[param],
                        attribute,
                        'attribute'
                      )
                    );
                }

              }

          }
        }
        //*/
      }


      //self.app.log.debug('parameters:', parameters);

      var numberOfValidations = validations.length; // + modelValidations.length;
      self.app.log.debug("performing " + transforms.length + " transforms, " + numberOfValidations + " validations, and " + sanitizations.length + " sanitizations...");

      //exceute transforms
      self.transform.process(transforms)

        //execute validations
        .then(function() {
          return self.validate.process(validations);
        })

        //exectute sanitizations
        //.then(function() {
        //  return self.services.sanitize.process(sanitizations)
        //})

        //execute validations
        //.then(function() {
        //  return self.app.services.validate.process(modelValidations);
        //})

        //resolve if all passed without errors
        .then(function() {

          //store the parameters on the request object
          req.parameters = parameters;
          self.app.log.debug('verified parameters:', parameters);

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
  _processMeta: function() {

    //process base meta data
    this._super();


    //loop through methods in metadata
    for( var method in this.meta.methods ) {

      //if the method is missing the params object, create it
      if( !this.meta.methods[method].params ) {
        this.meta.methods[method].params = {};
      }

      //loop through parameters for each method
      for( var param in this.meta.methods[method].params ) {

        //if transforms have been specified for this parameter
        if( this.meta.methods[method].params[param].transform ) {

          //loop through each transform
          for( var transform in this.meta.methods[method].params[param].transform ) {

            //warn & remove any transforms, validations, or sanitizations that don't exist
            if( !this.transform[transform] ) {
              this.log.warn('transform missing:',{transform: transform, controller: this.name, method: method, parameter: param});
              delete this.meta.methods[method].params[param].transform[transform];
            }

            //remove disabled transforms
            if( this.meta.methods[method].params[param].transform[transform] === false ) {
              delete this.meta.methods[method].params[param].transform[transform];
            }

          }
        } else {
          //this.log.warn('controller missing transform object:',controllerName + "." + method + "." + param);
          this.meta.methods[method].params[param].transform = {};
        }

        //if validations are missing on the parameter set up an empty object
        if( !this.meta.methods[method].params[param].validate ) {
          this.meta.methods[method].params[param].validate = {};
        }

        //if type has been specified on the parameter, add it as an actual validation
        if( this.meta.methods[method].params[param].type ) {
          this.meta.methods[method].params[param].validate[this.meta.methods[method].params[param].type] = true;
        }

        //loop through each validation
        for( var validation in this.meta.methods[method].params[param].validate ) {

          //warn & remove any validations that don't exist
          if( typeof this.validate[validation] !== 'function') {
            this.log.warn('validation missing:',{validation: validation, controller: this.name, parameter: param});

            delete this.meta.methods[method].params[param].validate[validation];

          }

          //remove disabled validations
          if( this.meta.methods[method].params[param].validate[validation] === false ) {
            delete this.meta.methods[method].params[param].validate[validation];
          }
        }

        /*
        //if sanitzations have been specified for this parameter
        if( this.meta.methods[method].params[param].sanitize ) {

          //loop through each transform
          for( var sanitization in this.meta.methods[method].params[param].sanitize ) {

            //warn & remove any transforms, validations, or sanitizations that don't exist
            if( !this.services.sanitize[sanitization] ) {
              this.log.warn('sanitization missing:',{sanitization: sanitization, controller: this.name, parameter: param});
              delete this.meta.methods[method].params[param].sanitize[sanitization];
            }

            //remove disabled sanitizations
            if( this.meta.methods[method].params[param].sanitize[sanitization] === false ) {
              delete this.meta.methods[method].params[param].sanitize[sanitization];
            }
          }

        } else {
          //this.log.warn('controller missing sanitize object:',this.name + "." + method + "." + param);
          this.meta.methods[method].params[param].sanitize = {};
        }


        //if this parameter has specified a model load the model's validations & sanitizations
        if( this.meta.methods[method].params[param].model ) {

          //if the model option is set to true, apply the related models' validations rules
          if( this.meta.methods[method].params[param].model === true ) {

            //if this controller has an associated model and the model's attributes have been defined
            if( this.models[this.name] && this.models[this.name].attributes) {

              //setup default model object on param
              this.meta.methods[method].params[param].model = {};
              this.meta.methods[method].params[param].model.validate = {};
              this.meta.methods[method].params[param].model.sanitize = {};

              //loop through the model's attributes
              for (var attributeName in this.models[this.name].attributes) {

                var attribute = this.models[this.name].attributes[attributeName];

                //if validations have been assigned to this attribute, set them up on the param's model
                if( attribute.validate ) {
                  this.meta.methods[method].params[param].model.validate[attributeName] = attribute.validate;
                }

                //if sanitizations have been assigned to this attribute, set them up on the param's model
                if( attribute.sanitize ) {
                  this.meta.methods[method].params[param].model.sanitize[attributeName] = attribute.sanitize;
                }

                for( var validation in this.meta.methods[method].params[param].model.validate[attributeName] ) {

                  //remove disabled validations
                  if( this.meta.methods[method].params[param].model.validate[attributeName][validation] === false ) {
                    delete this.meta.methods[method].params[param].model.validate[attributeName][validation];
                  }
                }

                for( var sanitization in this.meta.methods[method].params[param].model.sanitize[attributeName] ) {

                  //remove disabled sanitizations
                  if( this.meta.methods[method].params[param].model.sanitize[attributeName][sanitization] === false ) {
                    delete this.meta.methods[method].params[param].model.sanitize[attributeName][sanitization];
                  }
                }

              }

            }

          } else if( typeof this.meta.methods[method].params[param].model === 'object' ) {

            //if this controller has an associated model and the model's attributes have been defined
            if( this.models[this.name] && this.models[this.name] ) {
              if( this.models[this.name].attributes ) {

                //make sure we have a validate object on the parameter
                if( !this.meta.methods[method].params[param].model.validate ) {
                  this.meta.methods[method].params[param].model.validate = {};
                }

                //make sure we have a sanitize object on the parameter
                if( !this.meta.methods[method].params[param].model.sanitize ) {
                  this.meta.methods[method].params[param].model.sanitize = {};
                }

                //loop through the model's attributes
                for (var attributeName in this.models[this.name].attributes) {

                  var attribute = this.models[this.name].attributes[attributeName];

                  //if validations have been assigned to this attribute, set them up on the param's model
                  if( attribute.validate ) {
                    if( this.meta.methods[method].params[param].model.validate[attributeName] ) {
                      //this.log.debug('merging existing validation blueprint for ' + attributeName + ":",this.meta.methods[method].params[param].model.validate[attributeName]);
                      //this.log.debug('with the attribute validations: ',attribute.validate);
                      this.meta.methods[method].params[param].model.validate[attributeName] = merge(this.meta.methods[method].params[param].model.validate[attributeName], attribute.validate);
                    } else {
                      //this.log.debug('setting the validation blueprint for ' + attributeName + ":",attribute.validate);
                      this.meta.methods[method].params[param].model.validate[attributeName] = attribute.validate;
                    }
                  }

                  //if sanitizations have been assigned to this attribute, set them up on the param's model
                  if( attribute.sanitize ) {
                    if( this.meta.methods[method].params[param].model.sanitize[attributeName] ) {
                      this.meta.methods[method].params[param].model.sanitize[attributeName] = merge(this.meta.methods[method].params[param].model.sanitize[attributeName], attribute.sanitize);
                    } else {
                      this.meta.methods[method].params[param].model.sanitize[attributeName] = attribute.sanitize;
                    }
                  }

                  for( var validation in this.meta.methods[method].params[param].model.validate[attributeName] ) {

                    //remove disabled validations
                    if( this.meta.methods[method].params[param].model.validate[attributeName][validation] === false ) {
                      delete this.meta.methods[method].params[param].model.validate[attributeName][validation];
                    }
                  }

                  for( var sanitization in this.meta.methods[method].params[param].model.sanitize[attributeName] ) {

                    //remove disabled sanitizations
                    if( this.meta.methods[method].params[param].model.sanitize[attributeName][sanitization] === false ) {
                      delete this.meta.methods[method].params[param].model.sanitize[attributeName][sanitization];
                    }
                  }

                }

                //this.log.debug('final:',this.meta.methods[method].params[param].model);

              }
            }

          }

        }
         */

      }



    }


  },

  describe: function(resolve, reject, req) {

    //resolve response
    resolve({meta: {success: true}, controller: this.meta});

  },

  //can be overridden by the controller extension to manipulate the request or response
  afterAction: function(resolve, reject, req, res) {

    resolve({});
  }

});
