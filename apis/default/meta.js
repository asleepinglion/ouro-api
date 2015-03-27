/**
 * The Default Blueprint describes the methods of the controller.
 */

module.exports = {

  description: 'The default controller provides a basic set of methods for the API server.',

  methods: {

    default: {
      description: "The default action returns the status of the API.",
      async: true
    },

    describe: {

      description: "The describe method reflects the available services, controllers, and models.",
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
