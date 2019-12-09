const mongoose = require('mongoose');
const Store = mongoose.model('Store');

exports.homePage = (req, res) => {
  res.render('index');
};

exports.addStore = (req, res) => {
  res.render('editStore', {
    title: 'Add Store'
  });
};

exports.createStore = async (req, res) => {
  const store = await new Store(req.body).save();
  req.flash(
    'success',
    `Successfully Created ${store.name}. Care to leave a review?`
  );
  res.redirect(`/store/${store.slug}`);
};

exports.getStores = async (req, res) => {
  //Query database for all stores
  const stores = await Store.find();
  res.render('stores', {
    title: 'Stores',
    stores
  });
};

exports.editStore = async (req, res) => {
  //1. Find Store with the given Id
  const store = await Store.findOne({
    _id: req.params.id
  });
  //2. Confirm they are the owner of the store

  //3. Render out the edit form
  res.render('editStore', {
    title: `Edit info for ${store.name}`,
    store
  });
};

exports.updateStore = async (req, res) => {
  const store = await Store.findOneAndUpdate({
    _id: req.params.id
  }, req.body, {
    useFindAndModify: true,
    runValidators: true
  }).exec();
  req.flash(
    'success',
    `Successfully updated ${store.name}. Care to leave a review?`
  );
  res.redirect(`/store/${store.slug}`);
};