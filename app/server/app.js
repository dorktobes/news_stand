import path from 'path';
import express from 'express';
import cookieSession from 'cookie-session';
import passport from 'passport';
import BodyParser from 'body-parser';
import morgan from 'morgan';

import searchArticles from './middleware/searchArticles';
import authRoutes from './auth-routes';
import passportSetup from './config/passport-setup'; // not used, but needs to be required to run file
import db from './database/db'; // not used, but gets DB up and running
import getSources from './middleware/getSources';
import getPreferences from './middleware/getPreferences';
import setPreferences from './middleware/setPreferences';
import addFavorite from './middleware/addFavorite';
import scraper from './middleware/scraper.js';
import addComment from './middleware/addComment';
import getFavorites from './middleware/getFavorites';
import findArticle from './middleware/findArticle';
import getAllArticles from './middleware/getAllArticles';
import getRecommended from './middleware/recommendationEngine.js';

const app = express();
const publicPath = express.static(path.join(__dirname, '../'));
const indexPath = path.join(__dirname, '../index.html');

app.use(morgan('tiny'));
app.use(publicPath);

// ---- ORDER OF PASSPORT MIDDLEWARE IS IMPORTANT ---- //
// sets up both cookie expiration (1 day) and key for encrypting googleId into a cookie
app.use(cookieSession({
  maxAge: 24 * 60 * 60 * 1000,
  keys: [process.env.COOKIE_KEY],
}));

// gets passport running (not really sure beyond that)
app.use(passport.initialize());
app.use(passport.session());

// set up routes from  auth-routes.js
app.use('/auth', authRoutes);

app.use(BodyParser.json());
app.use(BodyParser.urlencoded({ extended: true }));

app.get('/articles', searchArticles, scraper, (request, response) => {
  const { articles } = request;
  response.json(articles);
});

app.get('/article/:id', getFavorites, findArticle, (request, response) => {
  const { article, favorited } = request;
  response.json({ article, favorited });
});

app.get('/sources', getSources, (request, response) => {
  response.json(request.sources);
});

app.get('/preferences', getPreferences, searchArticles, scraper, getFavorites, (request, response) => {
  const { articles, preferences, favorites } = request;
  response.json({ articles, preferences, favorites });
});

app.get('/recommended', getFavorites, getAllArticles, getRecommended, (request, response) => {
  response.json(request.recommendations);
});

app.post('/preferences', setPreferences, (request, response) => {
  // console.log('ABOUT TO SEND', request.updatedUser)
  response.send(request.updatedUser);
});

app.post('/favorites', addFavorite, (request, response) => {
  if (request.user) {
    const resObj = {
      message: 'favorite added',
      article: request.article,
    };
    response.status(201).end(JSON.stringify(resObj));
  } else {
    response.status(200).end('please log in before adding to favorites');
  }
});

app.get('/favorites', getFavorites, (request, response) => {
  const { favorites } = request;
  response.json({ favorites });
});

app.post('/comments', addComment, (request, response) => {
  if (request.user) {
    const resObj = {
      message: 'comment added',
      article: request.article,
    };
    response.status(201).end(JSON.stringify(resObj));
  } else {
    response.status(200).end('please log in before commenting');
  }
});

// catch-all route for implementing React Router
app.get('*', (request, response) => {
  response.sendFile(indexPath);
});


export default app;
