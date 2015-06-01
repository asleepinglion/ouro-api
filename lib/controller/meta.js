module.exports = {

  description: 'The base controller blueprint provides a simple shell from which other blueprints can extend',
  methods: {

    beforeAction: {
      description: 'The before action method is called before any exposed api method is executed.',
      async: true
    },

    afterAction: {
      description: 'The after action method is called after any exposed api method is executed.',
      async: true
    },

    describe: {
      description: 'The describe method returns the meta data for the controller.',
      action: true,
      async: true
    }

  }
};
