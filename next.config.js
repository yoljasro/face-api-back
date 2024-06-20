module.exports = {
    webpack: (config) => {
      config.module.rules.push({
        test: /\.ts$/,
        use: ['ts-loader'],
      });
      return config;
    },
    api: {
      bodyParser: false,
    },
  };
  