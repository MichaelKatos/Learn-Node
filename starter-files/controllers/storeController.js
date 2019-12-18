const mongoose = require('mongoose');
const Store = mongoose.model('Store');
const User = mongoose.model('User');
const multer = require('multer');
const jimp = require('jimp');
const uuid = require('uuid');

const multerOptions = {
  storage: multer.memoryStorage(),
  fileFilter(req, file, next) {
    const isPhoto = file.mimetype.startsWith('image/');
    if (isPhoto) {
      next(null, true);
    } else {
      next({
          message: "That filetype isnt't allowed"
        },
        false
      );
    }
  }
};

exports.homePage = (req, res) => {
  res.render('index');
};

exports.addStore = (req, res) => {
  res.render('editStore', {
    title: 'Add Store'
  });
};

exports.upload = multer(multerOptions).single('photo');

exports.resize = async (req, res, next) => {
  // check if there is no new file to resize
  if (!req.file) {
    next(); //skip to next middleware
    return;
  }
  const extension = req.file.mimetype.split('/')[1];
  req.body.photo = `${uuid.v4()}.${extension}`;
  const photo = await jimp.read(req.file.buffer);
  await photo.resize(800, jimp.AUTO);
  await photo.write(`./public/uploads/${req.body.photo}`);
  // once we have written the photo to our file system, keep going!
  next();
};

exports.createStore = async (req, res) => {
  req.body.author = req.user._id;
  const store = await new Store(req.body).save();
  req.flash(
    'success',
    `Successfully Created ${store.name}. Care to leave a review?`
  );
  res.redirect(`/store/${store.slug}`);
};

exports.getStores = async (req, res) => {
  const page = req.params.page || 1;
  const limit = 6;
  const skip = (page * limit) - limit;
  //Query database for all stores
  const storesPromise = Store
    .find()
    .skip(skip)
    .limit(limit)
    .sort({
      created: 'desc'
    });

  const countPromise = Store.countDocuments();

  const [stores, count] = await Promise.all([storesPromise, countPromise]);
  const pages = Math.ceil(count / limit);
  if (!stores.length && skip) {
    req.flash('info', `Page ${page} does not exist.  You have been redirected to page ${pages}`);
    res.redirect(`/stores/page/${pages}`);
    return;
  }
  res.render('stores', {
    title: 'Stores',
    stores,
    pages,
    page,
    count
  });
};

const confirmOwner = (store, user) => {
  if (!store.author.equals(user._id)) {
    throw Error('You must own a store in order to edit it');
  }
}

exports.editStore = async (req, res) => {
  //1. Find Store with the given Id
  const store = await Store.findOne({
    _id: req.params.id
  });
  //2. Confirm they are the owner of the store
  if (req.user.level < 20) {
    confirmOwner(store, req.user);
  }
  //3. Render out the edit form
  res.render('editStore', {
    title: `Edit info for ${store.name}`,
    store
  });
};

exports.updateStore = async (req, res) => {
  //set location data to be a point
  req.body.location.type = 'Point';
  // find and update store
  const store = await Store.findOneAndUpdate({
      _id: req.params.id
    },
    req.body, {
      new: true,
      runValidators: true
    }
  ).exec();
  req.flash(
    'success',
    `Successfully updated <strong>${store.name}</strong>. <a href="/store/${store.slug}">View Store</a>`
  );
  res.redirect(`/stores/${store._id}/edit`);
};

exports.getStoreBySlug = async (req, res, next) => {
  const store = await Store.findOne({
    slug: req.params.slug
  }).populate('author reviews');
  if (!store) {
    return next();
  }
  res.render('store', {
    store,
    title: store.name
  });
};

exports.getStoresByTag = async (req, res) => {
  const tag = req.params.tag;
  const tagQuery = tag || {
    $exists: true
  };
  const tagsPromise = Store.getTagsList();
  const storesPromise = Store.find({
    tags: tagQuery
  });
  const [tags, stores] = await Promise.all([tagsPromise, storesPromise]);
  res.render('tag', {
    tags,
    title: 'Tags',
    tag,
    stores
  });
};

exports.searchStores = async (req, res) => {
  const stores = await Store
    //1. Find stores that match
    .find({
      $text: {
        $search: req.query.q
      }
    }, {
      score: {
        $meta: 'textScore'
      }
    })
    //Sort matches
    .sort({
      score: {
        $meta: 'textScore'
      }
    })
    //limit to 5 stores
    .limit(5);
  res.json(stores);
};

exports.mapStores = async (req, res) => {
  const coordinates = [req.query.lng, req.query.lat].map(parseFloat);
  const distance = Number(req.query.distance) * 1609.34 || 40233.6 //User distance * 1 mile or 25 mile default
  const limit = Number(req.query.limit) || 10;
  const q = {
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates
        },
        $maxDistance: distance
      }
    }
  };

  const stores = await Store.find(q).select('slug name description photo location').limit(limit);
  res.json(stores);
};

exports.mapPage = async (req, res) => {
  res.render('map', {
    title: 'Map'
  });
};

exports.heartStore = async (req, res) => {
  const hearts = req.user.hearts.map(obj => obj.toString());
  const operator = hearts.includes(req.params.id) ? '$pull' : '$addToSet';
  const user = await User
    .findByIdAndUpdate(req.user._id, {
      [operator]: {
        hearts: req.params.id
      }
    }, {
      new: true
    });
  res.json(user);
};

exports.getHearts = async (req, res) => {
  const stores = await Store.find({
    _id: {
      $in: req.user.hearts
    }
  });
  res.render('stores', {
    title: 'My Favorites',
    stores
  });
};

exports.getTopStores = async (req, res) => {
  const stores = await Store.getTopStores();
  res.render('topStores', {
    stores,
    title: 'Top Stores'
  });
  // res.json(stores);
}