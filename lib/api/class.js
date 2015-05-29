"use strict";

var SuperJS = require('superjs');
var colors = require('colors');
var fs = require('fs');
var Promise = require('bluebird');
var _ = require('underscore');
var merge = require('recursive-merge');

module.exports = SuperJS.Application.extend({

  _metaFile: function() {
    this._super();
    this._loadMeta(__filename);
  },

  init: function() {
    this._super.apply(this, arguments);
  },

  beforeSetup: function() {

    //maintain map of resource classes
    this.resources = {};
    this.resources.controllers = {};
    this.resources.models = {};

    //maintain a list of adapters
    this.adapters = {};

    //maintain a list of connections
    this.connections = {};

    //maintain a list of controllers
    this.controllers = {};

    //localize the global config class
    this.config = this.configs.get('api');

    //load the package configuraiton
    this.configs.load('package.json', this.paths.get('cwd'), true, 'pkg');
  },

  setup: function() {

    //maintain a reference to the instance
    var self = this;

    this.schedule('json-server', { setup: { modulePath: this._modulePath(__dirname), alias: 'server' } });

  },

  beforeBoot: function() {

    console.log(colors.cyan("\n\n  sSSs   .S       S.    .S_sSSs      sSSs   .S_sSSs        .S    sSSs  "));
    console.log(colors.cyan(" d%%%%SP  .SS       SS.  .SS~YS%%%%b    d%%%%SP  .SS~YS%%%%b      .SS   d%%%%SP  "));
    console.log(colors.cyan("d%S'    S%S       S%S  S%S   `S%b  d%S'    S%S   `S%b     S%S  d%S'    "));
    console.log(colors.cyan("S%|     S%S       S%S  S%S    S%S  S%S     S%S    S%S     S%S  S%|     "));
    console.log(colors.cyan("S&S     S&S       S&S  S%S    d*S  S&S     S%S    d*S     S&S  S&S     "));
    console.log(colors.cyan("Y&Ss    S&S       S&S  S&S   .S*S  S&S_Ss  S&S   .S*S     S&S  Y&Ss    "));
    console.log(colors.red("`S&&S   S&S       S&S  S&S_sdSSS   S&S~SP  S&S_sdSSS      S&S  `S&&S   "));
    console.log(colors.red("  `S*S  S&S       S&S  S&S~YSSY    S&S     S&S~YSY%b       S&S    `S*S  "));
    console.log(colors.red("   l*S  S*b       d*S  S*S         S*b     S*S   `S%b     d*S     l*S  "));
    console.log(colors.red("  .S*P  S*S.     .S*S  S*S         S*S.    S*S    S%S    .S*S    .S*P  "));
    console.log(colors.red("sSS*S    SSSbs_sdSSS   S*S          SSSbs  S*S    S&S  sdSSS   sSS*S   "));
    console.log(colors.red("YSS'      YSSP~YSSY    S*S           YSSP  S*S    SSS  YSSY    YSS'    "));
    console.log(colors.red("                       SP                  SP                          "));
    console.log(colors.red("                       Y                   Y     Version " + SuperJS.version +  "\n"));

  },

  afterBoot: function() {
    this.loadAdapters();
    this.findResources();
    this.loadModels();
    this.loadControllers();
  },

  loadAdapters: function() {

    var adapters = this.configs.get('adapters');

    if( adapters ) {

      for( var adapter in adapters ) {

        if( fs.existsSync(this.paths.cwd + '/node_modules/superjs-' + adapter + '/lib/' + adapter + '/class.js' ) ) {

          this.loadAdapter(adapter, adapters[adapter]);

        }

      }

    }

    this.log.debug('adapters loaded:',Object.keys(this.adapters));

  },

  loadAdapter: function(adapter, options) {

    //load the adapter
    var Adapter = require(this.paths.cwd + '/node_modules/superjs-' + adapter + '/lib/' + adapter + '/class' );

    //instantiate & mount the adapter
    this.adapters[adapter] = new Adapter(this, options);

  },

  findResources: function() {

    //maintain reference to self
    var self = this;

    //make sure the apis folder has been defined
    if( fs.existsSync(self.paths.cwd+'/apis') ) {

      //get list of apis
      var apis = fs.readdirSync(self.paths.cwd+'/apis');

      //load each model
      apis.map(function(apiName) {

        //make sure the model exists
        if( fs.existsSync(self.paths.cwd+'/apis/'+apiName+'/controller.js') ) {
          self.resources.controllers[apiName] = require(self.paths.cwd + '/apis/' + apiName + '/controller');
        }

        //make sure the model exists
        if( fs.existsSync(self.paths.cwd+'/apis/'+apiName+'/model.js') ) {

          var Model = require(self.paths.cwd+'/apis/'+apiName+'/model');

          if( Model && typeof Model.prototype.adapterName === 'string' ) {

            if( typeof self.adapters[Model.prototype.adapterName] !== 'object' ) {

              self.log.warn('missing model adapter:', Model.prototype.adapterName);

            } else {

              if( typeof self.resources.models[Model.prototype.adapterName] !== 'object' ) {
                self.resources.models[Model.prototype.adapterName] = {};
              }

              self.resources.models[Model.prototype.adapterName][apiName] = Model;

            }

          }
        }

      });

    }

  },

  loadModels: function() {

    //maintain reference to self
    var self = this;

    for( var adapter in self.resources.models ) {

      for( var model in self.resources.models[adapter] ) {

        this.adapters[adapter].loadModel(model, self.resources.models[adapter][model]);
      }

      if( typeof this.adapters[adapter].finalize === 'function' ) {
        this.adapters[adapter].finalize();
      }

      self.log.debug('loaded ' + adapter + ' models:', Object.keys(self.resources.models[adapter]));

    }


  },

  loadControllers: function() {

    //maintain reference to self
    var self = this;

    //load default controller
    self.loadController('default', require(self.paths.cwd + '/node_modules/superjs-api/apis/default/controller'));

    if( fs.existsSync(self.paths.cwd + '/apis') ) {

      //get list of modules
      var modules = fs.readdirSync(self.paths.cwd + '/apis');

      //load each controller
      modules.map(function(apiName) {

        //make sure the controller exists
        if (fs.existsSync(self.paths.cwd + '/apis/' + apiName + '/controller.js')) {

          var Controller = require(self.paths.cwd + '/apis/' + apiName + '/controller');

          if (Controller) {
            self.loadController(apiName, Controller);
          }
        }

      });

    }

    this.log.debug('controllers loaded:',Object.keys(this.controllers));
  },

  loadController: function(controllerName, Controller) {

    //maintain reference to instance
    var self = this;

    //instantiate the controller
    var controller = new Controller(this, this.adapters[Controller.prototype.adapterName]);

    //assign a name, if one is not assigned
    if( !controller.name) {
      controller.name = controllerName;
    }

    //make the controller available to the application
    this.controllers[controller.name] = controller;

    //merge model meta onto controller
    this.log.debug('controller model ' + controller.name + ':', typeof controller.model);

    if( controller.model ) {
      for( var method in controller.meta.methods ) {

        //maintain list of bad validations
        var badValidations = [];

        if( controller.meta.methods[method].action ) {
          for( var param in controller.meta.methods[method].params ) {
            if( controller.meta.methods[method].params[param].model ) {

              if( typeof controller.meta.methods[method].params[param].model.validate !== 'object') {
                controller.meta.methods[method].params[param].model.validate = {};
              }

              for( var attribute in controller.model.attributes ) {

                if( typeof controller.meta.methods[method].params[param].model.validate[attribute] !== 'object') {
                  controller.meta.methods[method].params[param].model.validate[attribute] = {};
                }

                if( controller.model.attributes[attribute].validate ) {

                  controller.meta.methods[method].params[param].model.validate[attribute] = merge(controller.meta.methods[method].params[param].model.validate[attribute], controller.model.attributes[attribute].validate);
                }



                for( var validation in controller.meta.methods[method].params[param].model.validate[attribute] ) {

                  if( controller.model.attributes[attribute].type ) {
                    controller.meta.methods[method].params[param].model.validate[attribute][controller.model.attributes[attribute].type] = true;
                  }

                  if( !this.validate[validation] && badValidations.indexOf(validation) === -1 ) {
                    badValidations.push(validation);
                  }
                }
              }
            }
          }
        }

        badValidations.map(function(validation) {
          self.log.warn('validation missing:',{validation: validation, controller: controller.name, method: method, parameter: param});
        });

      }
    }



    //generate action map
    //todo: setup afterAction/beforeAction hooks in map
    controller.meta._actionMap = {};
    Object.keys(controller.meta.methods).map(function(method) {

      if( controller.meta.methods[method].action === true ) {
        controller.meta._actionMap[method.toLowerCase()] = method;
      }
    });

  },

  newRequest: function(req, res) {

    //maintain reference to instance
    var self = this;

    //determine the controller and action
    self.routeRequest(req)

      //authenticate the request
      .then(function() {
        return self.authRequest(req);
      })

      //execute the request
      .then(function() {
        return self.executeRequest(req, res);
      })

      //handle any errors
      .catch(function(err) {
        return self.server.processError(err, req, res);
      });
  },

  routeRequest: function(resolve, reject, req) {

    //maintain reference to instance
    var self = this;

    var path = req.path.split('/');

    if( path.length > 1 ) {

      //handle Application & REST Resource Routes
      if( path.length == 2 ) {

        if(_.isEmpty(path[1]) ) {

          req.controller = 'default';
          req.action = 'default';

        } else if( path[1] === 'describe' ) {

          req.controller = 'default';
          req.action = 'describe';

        } else {

          req.actionType = 'REST';

          if (path[1] in self.controllers) {

            //set controller name
            req.controller = path[1];

            //check to see if this controller is rest enabled
            if (self.controllers[req.controller].restEnabled) {

              //determine action based on request method
              if (req.method === 'GET') {
                req.action = 'search';
              } else if (req.method === 'POST') {
                req.action = 'create';
              } else if (req.method === 'PUT') {
                req.action = 'update';
              } else if (req.method === 'DELETE') {
                req.action = 'delete';
              }
            }

          }
        }

      //handle RPC routes
      } else if( path.length >= 3 ) {

        req.actionType = 'RPC';

        //check if controller exists
        if( path[1] in self.controllers ) {

          //set the controller name
          req.controller = path[1];

          //check if the method exists on controller and its configured as an action
          if( self.controllers[path[1]].meta._actionMap[path[2].toLowerCase()] ) {

            //set the action name
            req.action = self.controllers[path[1]].meta._actionMap[path[2].toLowerCase()];

          }

        }
      }

      //reject if the requested controller doesn't exist
      if( !req.controller ) {
        return reject(new SuperJS.Error('controller_not_found', 'Controller not found.', {status: 404}));
      }

      //reject if the requested action doesn't exist
      if( !req.action ) {
        if( req.actionType === 'REST' ) {
          return reject(new SuperJS.Error('action_not_found', 'REST Controller action ' + req.method + ' not implemented.', {status: 400}));
        } else {
          return reject(new SuperJS.Error('action_not_found', 'Controller RPC action ' + req.method + ' not found.', {status: 404}));
        }
      }

      self.log.info('routing request:',{controller: req.controller, action: req.action});
      resolve();
    } else {

      reject(new SuperJS.Error('malformed_request', 'Something went wrong trying to process your request.', {status: 500}));

    }

  },

  authRequest: function(resolve, reject, req) {

    //maintain reference to self
    var self = this;

    //check if authentication is enabled
    if( !self.config.security.enabled ) {
      return resolve();
    }

    //check if the requested action has security disabled
    if( self.controllers[req.controller].meta.methods[req.action] && self.controllers[req.controller].meta.methods[req.action].security === false ) {
      return resolve();

    } else {

      self.log.info('authenticating request...');

      //determine controller name for auth
      var controllerName = self.config.security.controllerName || 'user';

      //make sure the authorize method has been implemented on the auth controller
      if( !self.controllers[controllerName] || !self.controllers[controllerName].authorize ) {

        self.log.error("The " + controllerName + " controller's authorize method has not been implemented.");
        return reject(new SuperJS.Error('authorize_not_configured', "The " + controllerName + " controller's _authorize method has not been implemented.", {status: 500}));

      }

      //execute authorize method on the auth controller
      self.controllers[controllerName].authorize(req)
        .then(function(session) {

          //save the session to the request
          req.session = session;
          resolve();

        })
        .catch(function(err) {
          err.status = 401;
          reject(err);
        });

    }
  },

  executeRequest: function(req, res) {

    //maintain reference to instance
    var self = this;

    var camelCaseName = req.action.substr(0,1).toUpperCase()+req.action.substr(1,req.action.length-1);

    //this.log.debug('executing method:', {controller: req.controller, action: req.action});

    //emit beforeAction events for secondary operations
    self.emit('beforeAction', req);
    self.controllers[req.controller].emit('beforeAction', req);
    self.controllers[req.controller].emit('before' + camelCaseName, req);


    //if mocking is enabled, return mocked response if one exists
    return self.mockResponse(req, res)

      //if caching is enabled, return cached response if one exists
      .then(function() {

        if( self.config.cache === true ) {
          //todo: integrate key/store request caching with red
          //http://stevenlu.com/posts/2013/03/07/using-redis-for-caching-in-nodejs/
        }

      })

      .then(function() {

        //execute controller action if we've haven't already responded to the request
        if( !res.responded ) {


          //call before action method
          return self.controllers[req.controller].beforeAction(req)

            //update the response object
            .then(function(response) {
              return self.server.setResponse(response, res);
            })

            //call specific before action method
            .then(function(response) {
              if( self.controllers[req.controller]['before' + camelCaseName] ) {
                return self.controllers[req.controller]['before' + camelCaseName](req);
              } else {
                return {};
              }
            })

            //update the response object
            .then(function(response) {
              return self.server.setResponse(response, res);
            })

            //verify the request by transforming, validating, and sanitizing parameters
            .then(function() {
              if( self.controllers[req.controller].verifyRequest ) {
                return self.controllers[req.controller].verifyRequest(req);
              }
            })

            //execute the requested action
            .then(function() {
              return self.controllers[req.controller][req.action](req);
            })

            //update the response object
            .then(function(response) {
              return self.server.setResponse(response, res);
            })

            //call specific after action method
            .then(function(response) {
              if( self.controllers[req.controller]['after' + camelCaseName] ) {
                return self.controllers[req.controller]['after' + camelCaseName](req, res);
              } else {
                return {};
              }
            })

            //update the response object
            .then(function(response) {
              return self.server.setResponse(response, res);
            })

            //call the after action method
            .then(function() {
              return self.controllers[req.controller].afterAction(req, res);
            })

            //update the response object
            .then(function(response) {
              return self.server.setResponse(response, res);
            })

        }

     })

      //send response
      .then(function() {
        return self.server.sendResponse(req, res);
      })

      //emit afterAction events for secondary operations
      .then(function() {

        self.emit('afterAction', req, res.response);
        self.controllers[req.controller].emit('afterAction', req, res.response);
        self.controllers[req.controller].emit('after' + camelCaseName, req);

      });

  },

  mockResponse: function(resolve, reject, req, res) {

    //maintain a reference to the instance
    var self = this;

    if( typeof self.config.mock === 'object' &&
      self.config.mock.enabled === true ) {

      //determine which mock to use
      var mockFile = (req.param('_mock')) || 'success';
      mockFile = mockFile.replace('_','-');

      if(  self.config.mock.specific === false ||
        ( self.config.mock.specific === true &&
        self.controllers[req.controller].meta.methods[req.action] &&
        self.controllers[req.controller].meta.methods[req.action].mock === true ) ) {

        //determine mock file directory
        var mockShortPath = '/apis/' + req.controller + '/mocks/' + req.action;
        var mockPath = self.path.cwd + mockShortPath;

        //make sure the mock exists
        if (fs.existsSync(mockPath + '/' + mockFile + '.js')) {

          //load the mock file
          var mock = require(mockPath + '/' + mockFile);

          //attempt to do a basic validation of the mock file
          if (typeof mock !== 'object' ||
            typeof mock.request !== 'object' ||
            typeof mock.response !== 'object') {

            return reject(new SuperJS.Error('mock_invalid', 'The mock of the ' + mockFile + ' response for the ' + req.controller + '.' + req.action + ' action was invalid.', {status: 500}));
          }

          self.log.debug('mocking response:', {mock: mockFile, path: mockPath});

          //set the stat us based on the headers
          res.status(mock.response.headers.status);

          //set the response equal to the mock respond body
          res.response = mock.response.body;

          //let superjs know we already responded to the request.
          res.responded = true;

          resolve();

        } else {

          if (self.config.mock.required !== true && !req.param('_mock') ) {
            resolve();
          } else {
            reject(new SuperJS.Error('mock_not_found', 'The mock of the ' + mockFile + ' response for the ' + req.controller + '.' + req.action + ' action was not found.', {status: 404}));
          }
        }

      } else {

        if (self.config.mock.required !== true && !req.param('_mock') ) {
          resolve();
        } else {
          reject(new SuperJS.Error('mock_not_found', 'The mock of the ' + mockFile + ' response for the ' + req.controller + '.' + req.action + ' action was not enabled.', {status: 404}));
        }
      }

    } else {
      resolve();
    }

  },

  checkCache: function(resolve, reject, req, res) {

    //maintain a reference to the instance
    var self = this;

    resolve();

  },

  ready: function() {

    //define port
    var port = process.env.PORT || this.config.port || this.config.pkg.port || 8888;
    this.log.info('starting server on port:', port);
    this.log.break();

    //start listening on port
    this.server.express.listen(port);

    //call parent ready
    this._super.apply(this, arguments);
  }

});
