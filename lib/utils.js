const fetch = require('node-fetch');
const DOMParser = require('dom-parser');
const parser = new DOMParser();

const getHtmlFromPage = async (url) => {

  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'text/html'
      },
    });

    const htmlString = await response.text();

    return parser.parseFromString(htmlString, 'text/html');
  } catch (e) {
    console.error('Http error', e);
  }

};

const getEpisodeNumber = episode => episode.match(/[0-9]/gi).join('');

module.exports = {
  getHtmlFromPage,
  getEpisodeNumber,
};
