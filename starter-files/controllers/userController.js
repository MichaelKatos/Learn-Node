const mongoose = require('mongoose');
const User = mongoose.model('User');


exports.loginForm = (req, res) => {
  res.render('login', {
    title: 'Login'
  });
};

exports.registerForm = (req, res) => {
  res.render('register', {
    title: 'Register'
  });
};

exports.validateRegister = (req, res, next) => {
  req.sanitizeBody('name');
  req.checkBody('name', 'You must supply a name!').notEmpty();
  req.checkBody('email', 'That email is not valid!').isEmail();
  req.sanitizeBody('email').normalizeEmail({
    remove_dots: false,
    remove_extension: false,
    gmail_remove_subaddress: false
  });
  req.checkBody('password', 'Password cannot be blank!').notEmpty();
  req.checkBody('password-confirm', 'Must confirm your password').notEmpty();
  req
    .checkBody('password-confirm', 'Your passwords do not match')
    .equals(req.body.password);

  const errors = req.validationErrors();
  if (errors) {
    req.flash(
      'error',
      errors.map(err => err.msg)
    );
    res.render('register', {
      title: 'Register',
      body: req.body,
      flashes: req.flash()
    });
    return; // stop function from running
  }
  next(); //there were no errors!
};

exports.register = async (req, res, next) => {
  const user = new User({
    email: req.body.email,
    name: req.body.name
  });
  await User.register(user, req.body.password);
  next(); //Pass to authContoller.login
};

exports.account = (req, res) => {
  res.render('account', {
    title: 'Your Account'
  });
};

exports.updateAccount = async (req, res) => {
  const updates = {
    name: req.body.name,
    email: req.body.email
  };
  const user = await User.findOneAndUpdate({
    _id: req.user._id
  }, {
    $set: updates
  }, {
    new: true,
    runValidators: true,
    context: 'query'
  });
  req.flash('success', `${user.name}'s profile has been updated!`);
  res.redirect('back');
};