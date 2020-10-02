const R = require('ramda');
const fetch = require('node-fetch');
const DOMParser = require('dom-parser');

const parser = new DOMParser();

const COMICS_PER_PAGE = 10;

const getHtmlFromPage = async (url) => {

  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'text/html',
        'referer': 'http://www.webtoons.com/'
      },
      mode: 'no-cors',
    });

    const htmlString = await response.text();

    return parser.parseFromString(htmlString, 'text/html');
  } catch (e) {
    console.error('Http error', e);
  }
};

class WebtoonParser {
  constructor() {
    this.comicsList = []
  }

  async _getComicsListHTML() {
    try {
      const html = await getHtmlFromPage('https://www.webtoons.com/en/genre');

      const cardsList = html.getElementsByClassName('card_lst');

      const items = cardsList.reduce((accum, item) => {
        const comicsNodes = item.getElementsByTagName('li');

        accum.push(comicsNodes);
        return accum;
      }, []);

      return R.flatten(items);
    } catch (e) {
      console.error('Parses comics html failed', e);
    }
  }

  _getBaseComicsInfo(item) {
    try {
      const link = item.getElementsByTagName('a')[0].getAttribute('href');
      const image = item.getElementsByTagName('img')[0].getAttribute('src');
      const name = item.getElementsByClassName('subj')[0].textContent;
      const author = item.getElementsByClassName('author')[0].textContent;

      return {
        link,
        image,
        name,
        author,
      }
    } catch (e) {
      console.error('Error while parse comics item');
    }
  }


  async _getTotalPagesForComics(link) {
    const html = await getHtmlFromPage(`${link}&page=1`);

    const eplListNode = html.getElementById('_listUl');

    const lastComicsId = eplListNode.getElementsByClassName('tx')[0].childNodes[0].text.replace('#', '');

    return Math.ceil(lastComicsId / COMICS_PER_PAGE);
  };

  async getFullInfo(item, page = 1) {
    try {
      const html = await getHtmlFromPage(`${item.link}&page=${page}`);

      const comicsInfoContainer = html.getElementsByClassName('cnt');
      const views = comicsInfoContainer[0].textContent;
      const rating = comicsInfoContainer[1].textContent;

      const eplListNode = html.getElementById('_listUl');

      const lastEpisodeNode = eplListNode.childNodes[1];

      const countEpisodes = lastEpisodeNode.getAttribute('id').replace(/\D/gi, '');

      return {
        ...item,
        views,
        rating,
        countEpisodes,
      };
    } catch (e) {
      console.log('-------------------------------');
      console.error('Error while parse full comics info - ', item.name);
      console.log('-------------------------------');
    }
  }

  getEpisodeImagesPath(images) {
    return images.reduce((accum, image) => {
      accum.push(image.getAttribute('data-url'));
      return accum;
    }, []);
  }

  async getEpisodeByUrl(url, episodeNumber) {
    const html = await getHtmlFromPage(`${url}&episode_no=${episodeNumber}`);

    const title = html.getElementsByTagName('h1')[0].textContent;

    const contentNode = html.getElementsByClassName('viewer_img')[0];

    const images = contentNode.getElementsByTagName('img');

    const imagesPaths = this.getEpisodeImagesPath(images);


    return {
      title: title,
      content: imagesPaths,
    }
  }

  async getComicsList() {
    const comicsNodeList = await this._getComicsListHTML();

    this.comicsList = comicsNodeList.map(this._getBaseComicsInfo);

    return this.comicsList;
  }


  _parseComicsInPage(comicsNode) {
    return {
      episodeUrl: comicsNode.getElementsByTagName('a')[0].getAttribute('href'),
      date: comicsNode.getElementsByClassName('date')[0].textContent,
      title: comicsNode.getElementsByClassName('subj')[0].textContent,
      likes: comicsNode.getElementsByClassName('like_area')[0].textContent,
    }
  }

  async _parseComicsPage(url, page) {
    try {
      const html = await getHtmlFromPage(`${url}&page=${page}`);
      const eplListNode = html.getElementById('_listUl');
      const episodeNodes = eplListNode.getElementsByTagName('li');

      return await Promise.all(episodeNodes.map(comicsNode => this._parseComicsInPage(comicsNode)));
    } catch (e) {
      console.log('-------------------------------');
      console.error('Error while parsing');
      console.log('-------------------------------');
    }
  }

  async parseAllComicsEpisodes(comicsUrl) {
    const totalPages = await this._getTotalPagesForComics(comicsUrl);
    const pagesArray = [...Array(totalPages).keys()].map(i => i + 1).reverse();

    return await Promise.all(pagesArray.map(async page => {
      return await this._parseComicsPage(comicsUrl, page);
    }));
  }
}

export default WebtoonParser;
