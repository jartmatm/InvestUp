import app from './app.json';
import chrome from './chrome.json';
import common from './common.json';
import documents from './documents.json';
import feed from './feed.json';
import home from './home.json';
import navigation from './navigation.json';
import portfolio from './portfolio.json';
import profile from './profile.json';
import publish from './publish.json';
import send from './send.json';

export default {
  ...common,
  ...navigation,
  ...chrome,
  ...app,
  ...feed,
  ...home,
  ...send,
  ...portfolio,
  ...profile,
  ...publish,
  ...documents,
};
