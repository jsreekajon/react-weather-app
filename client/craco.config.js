module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // Exclude source-map-loader warnings for react-datepicker
      webpackConfig.module.rules = webpackConfig.module.rules.map(rule => {
        if (rule.oneOf) {
          rule.oneOf = rule.oneOf.map(innerRule => {
            if (
              innerRule.enforce === 'pre' &&
              innerRule.use &&
              innerRule.use.find(u => u.loader && u.loader.includes('source-map-loader'))
            ) {
              innerRule.exclude = /react-datepicker/;
            }
            return innerRule;
          });
        }
        return rule;
      });

      return webpackConfig;
    }
  }
};
