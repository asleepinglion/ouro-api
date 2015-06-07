module.exports = {

  description: 'The default controller provides a basic set of methods for the API server.',

  methods: {

    run: {

      description: "The describe method reflects the available services, controllers, and models.",
      action: true,
      security: false,
      async: true,
      params: {

        //todo: use options parameter object with merge transform
        options: {
          description: "An object expression which denotes what properties to return.",
          type: "object",
          default: {
            controllers: true,
            models: true
          },
          transform: {
            object: true
          }
        }

      }
    }

  }

};
