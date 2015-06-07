module.exports = {

  description: 'The Default action for the Default controller',

  methods: {

    run: {

      description: "The default action returns the status of the API.",
      action: true,
      security: false,
      async: true
    }

  }

};
