const R = require('ramda');
const { getHtmlFromPage } = require('./utils');

class WebtoonParser {
  constructor() {
    this.comicsList = []
  }

  async getComicsListHTML() {
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

  getBaseComicsInfo(item) {
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

  async getFullInfo(item) {
    try {
      const html = await getHtmlFromPage(`${item.link}&page=1`);

      const comicsInfoContainer = html.getElementsByClassName('cnt');
      const views = comicsInfoContainer[0].textContent;
      const rating = comicsInfoContainer[1].textContent;

      const eplListNode = html.getElementById('_listUl');

      const lastEpisodeNode = eplListNode.childNodes[1];

      const countEpisodes = lastEpisodeNode.getElementsByClassName('subj')[0].textContent;

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

  async getEpisodeByUrl(url) {
    const html = await getHtmlFromPage(`${url}&episode_no=1`);

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
    const comicsNodeList = await this.getComicsListHTML();

    this.comicsList = comicsNodeList.map(this.getBaseComicsInfo);

    return this.comicsList;
  }
}

export default WebtoonParser;

