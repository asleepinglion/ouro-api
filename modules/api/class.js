"use strict";

var SuperJS = require('superjs');
var colors = require('colors');
var fs = require('fs');
var Promise = require('bluebird');
var _ = require('underscore');

module.exports = SuperJS.Application.extend({

  _metaFile: function() {
    this._super();
    this._loadMeta(__filename);
  },

  init: function(options) {
    this._super(options);
  },

  beforeBuild: function() {

    //maintain a list of adapters
    this.adapters = {};

    //maintain a list of connections
    this.connections = {};

    //maintain a list of models
    this.models = {};

    //maintain a list of controllers
    this.controllers = {};
  },

  build: function() {

    //maintain a reference to the instance
    var self = this;

    this.schedule('path', { build: { subModule: __dirname, shortcut: 'paths', local: true} });

    this.schedule('env', { build: {subModule: __dirname, shorcut:'env', local: true} });

    this.schedule('config', { build: { subModule: __dirname, shortcut: 'config', local: true, after: function() {

      //load the package.json from the working directory
      self.config.load('package.json', self.paths.cwd, true, 'pkg');

    }}});

    this.schedule('json-server', { build: { subModule: __dirname, shortcut: 'server', local: true } });

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
    this.loadControllers();
  },

  loadAdapters: function() {

    if( this.config.data && this.config.data.adapters ) {

      for( var adapter in this.config.data.adapters ) {

        if( fs.existsSync(this.paths.cwd + '/node_modules/superjs-' + adapter + '/modules/' + adapter + '/class.js' ) ) {

          this.loadAdapter(adapter, this.config.data.adapters[adapter]);

        }

      }

    }

    this.log.info('adapters loaded:',Object.keys(this.adapters));

  },

  loadAdapter: function(adapter, options) {

    //load the adapter
    var Adapter = require(this.paths.cwd + '/node_modules/superjs-' + adapter + '/modules/' + adapter + '/class' );

    //instantiate & mount the adapter
    this.adapters[adapter] = new Adapter(this, options);

  },

  //load controllers by going through module folders
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

    this.log.info('controllers loaded:',Object.keys(this.controllers));
  },

  //load the controller
  loadController: function(controllerName, Controller) {

    this.log.debug('loading controller:',controllerName);

    //instantiate the controller
    var controller = new Controller(this);

    //assign a name, if one is not assigned
    if( !controller.name) {
      controller.name = controllerName;
    }

    //make the controller available to th e application
    this.controllers[controller.name] = controller;
  },


  //run requests through the request engine
  newRequest: function(req, res) {

    //maintain reference to instance
    var self = this;

    //determine the controller and action
    self.routeRequest(req)

      //authenticate the request
      //.then(function() {
      //  return self.authenticateRequest(req);
      //})

      //execute the request
      .then(function() {
        return self.executeRequest(req, res);
      })

      //handle any errors
      .catch(function(err) {
        return self.server.processError(err, req, res);
      });
  },

  //process request for REST & RPC methods
  routeRequest: function(req) {

    //maintain reference to instance
    var self = this;

    //return promise
    return new Promise(function(resolve, reject) {

      var path = req.path.split('/');

      if( path.length > 1 ) {

        //Handle Application & REST Resource Routes
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

            //check if action exists on controller
            if( path[2] in self.controllers[path[1]]) {

              //set the action name
              req.action = path[2];
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

    });

  },

  /*
  //check authentication
  authenticateRequest: function(req) {

    //maintain reference to self
    var self = this;

    //return promise
    return new Promise(function(resolve, reject) {

      //check if authentication is enabled
      if( !self.config.security.enabled ) {
        return resolve();
      }

      //check if the requested action is public
      if( self.controllers[req.controller].public && _.contains(self.controllers[req.controller].public, req.action) ) {
        return resolve();

      } else {

        self.log.info('authenticating request...');

        //determine controller name for auth
        var controllerName = ( self.config.security.controllerName ) ? self.config.security.controllerName : 'user';

        //make sure the _authorize method has been implemented on the auth controller
        if( !self.controllers[controllerName] || !self.controllers[controllerName].authorize ) {

          self.log.error("The " + controllerName + " controller's authorize method has not been implemented.");
          return reject(new SuperJS.Error('authorize_not_configured', "The " + controllerName + " controller's _authorize method has not been implemented.", {status: 500}));

        }

        //execute authorize method on the auth controller
        self.controllers[controllerName].authorize(req, function(err, user) {

          if( err || !user) {

            //if there was an error or the user was not found return failure
            return reject(new SuperJS.Error('authentication_failed', "Authentication failed.", {status: 403}));

          } else {

            //otherwise continue to process request
            return resolve();
          }

        });

      }

    });
  },

  */

  //execute request
  executeRequest: function(req, res) {

    //maintain reference to instance
    var self = this;

    //this.log.debug('executing method:', {controller: req.controller, action: req.action});

    //emit beforeAction events for secondary operations
    self.controllers[req.controller].emit('beforeAction', req);
    self.controllers[req.controller].emit('before' + req.action, req);

    /*
    //if mocking is enabled, return mocked response if one exists.
    return self.mockResponse(req, res)

      //if caching is enabled, return cached response if one exists
      .then(function() {

        if( self.config.server.cache === true ) {
          //todo: integrate key/store request caching with redis
          //http://stevenlu.com/posts/2013/03/07/using-redis-for-caching-in-nodejs/
        }

      })

      .then(function() {

        //execute controller action if we've haven't already responded to the request
        if( !res.responded ) {
        */


          //call before action method
          return self.controllers[req.controller].beforeAction(req)

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

            //call the after action method
            .then(function() {
              return self.controllers[req.controller].afterAction(req);
            })

            //update the response object
            .then(function(response) {
              return self.server.setResponse(response, res);
            })

    //    }

     //})

      //send response
      .then(function() {
        return self.server.sendResponse(req, res);
      })

      //emit afterAction events for secondary operations
      .then(function() {

        self.controllers[req.controller].emit('afterAction', req, res.response);
        self.controllers[req.controller].emit('after' + req.action, req);

      });

  },

  /*
  //mock the response from snapshot files (don't use in production).
  mockResponse: function(req, res) {

    //maintain a reference to the instance
    var self = this;

    return new Promise(function(resolve, reject) {

      if( typeof self.config.server.mock === 'object' &&
        self.config.server.mock.enabled === true ) {

        //determine which mock to use
        var mockFile = (req.param('_mock')) || 'success';
        mockFile = mockFile.replace('_','-');

        if(  self.config.server.mock.specific === false ||
          ( self.config.server.mock.specific === true &&
          self.controllers[req.controller].blueprint.actions[req.action].mock === true ) ) {

          //determine mock file directory
          var mockShortPath = '/modules/' + req.controller + '/mocks/' + req.action;
          var mockPath = self.appPath + mockShortPath;

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

            if (self.config.server.mock.required !== true && !req.param('_mock') ) {
              resolve();
            } else {
              reject(new SuperJS.Error('mock_not_found', 'The mock of the ' + mockFile + ' response for the ' + req.controller + '.' + req.action + ' action was not found.', {status: 404}));
            }
          }

        } else {

          if (self.config.server.mock.required !== true && !req.param('_mock') ) {
            resolve();
          } else {
            reject(new SuperJS.Error('mock_not_found', 'The mock of the ' + mockFile + ' response for the ' + req.controller + '.' + req.action + ' action was not enabled.', {status: 404}));
          }
        }

      } else {
        resolve();
      }

    });

  },

  //check cache for the request
  checkCache: function(req, res) {

    //maintain a reference to the instance
    var self = this;

    return new Promise(function(resolve, reject) {
      resolve();
    });

  },

  */

  ready: function() {

    //define port
    var port = process.env.PORT || this.config.server.port || this.config.pkg.port || 8888;
    this.log.info('starting server on port:', port);
    this.log.break();

    //start listening on port
    this.server.express.listen(port);

  }

});
