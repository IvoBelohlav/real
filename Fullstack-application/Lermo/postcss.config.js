module.exports = {
  plugins: [
    require('tailwindcss'),
    require('autoprefixer'),
    // Removed postcss-prefix-selector as it's redundant with Shadow DOM
  ],
};
