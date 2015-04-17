module.exports = {

  name: "Api",
  description: "The API class provides mechanisms for building web APIs.",

  methods: {

    routeRequest: {
      description: "Route request using the url schema and request method to determine the controller and action.",
      async: true
    },

    authRequest: {
      description: "Authorize the request if security is enabled for the current controller and action.",
      async: true
    },

    mockResponse: {
      description: "Return a mocked response instead of the actual response if one exist and the feature is enabled.",
      async: true
    },

    checkCache: {
      description: "Check configured Redis connection for a cached result of the request instead of processing the action.",
      async: true
    }
  }

};
